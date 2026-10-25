import {parse as parseHtml} from 'parse5';
import {parse as parseJavaScript} from '@babel/parser';

export function scriptBlocks(html) {
  const document = parseHtml(html, {sourceCodeLocationInfo: true});
  const blocks = [];
  function visit(node) {
    if (node.tagName === 'script' && node.sourceCodeLocation) {
      const location = node.sourceCodeLocation;
      // parse5 can leave an unclosed script's element end at its opening;
      // include its raw-text child through EOF, while keeping self-closing
      // foreign-content scripts bounded to their actual element.
      const end = location.endTag?.endOffset ?? Math.max(location.endOffset,
        location.startTag.endOffset, ...node.childNodes.map(child => child.sourceCodeLocation?.endOffset ?? 0));
      blocks.push({start: location.startOffset, end,
        bodyStart: location.startTag.endOffset,
        bodyEnd: location.endTag?.startOffset ?? end});
      return;
    }
    for (const child of node.childNodes || []) visit(child);
    if (node.content) visit(node.content);
  }
  visit(document);
  return blocks.sort((a, b) => a.start - b.start);
}

export function translateOutsideScripts(html, translate) {
  let cursor = 0, output = '';
  for (const block of scriptBlocks(html)) {
    output += translate(html.slice(cursor, block.start)) + html.slice(block.start, block.end);
    cursor = block.end;
  }
  return output + translate(html.slice(cursor));
}

function isLoaderCall(expression) {
  const names = ['enqueue', 'streamController', '__remixContext'];
  if (expression?.type !== 'CallExpression') return false;
  let target = expression.callee;
  for (const name of names) {
    if (target?.type !== 'MemberExpression' || target.computed || target.property.name !== name) return false;
    target = target.object;
  }
  return target?.type === 'Identifier' && target.name === 'window';
}

// Both editions use the same parsed script boundary. Only replace the actual
// top-level loader call, never a similar string/comment or a later end tag.
export function replaceLoaderStream(html, serialized) {
  const replacements = [];
  for (const block of scriptBlocks(html)) {
    const body = html.slice(block.bodyStart, block.bodyEnd);
    if (!body.includes('__remixContext')) continue;
    const ast = parseJavaScript(body, {sourceType: 'unambiguous'});
    for (const statement of ast.program.body) {
      if (statement.type !== 'ExpressionStatement' || !isLoaderCall(statement.expression)) continue;
      replacements.push({start: block.bodyStart + statement.expression.start,
        end: block.bodyStart + statement.expression.end});
    }
  }
  if (replacements.length !== 1) throw new Error('Expected exactly one inline Bump loader stream');
  const {start, end} = replacements[0];
  return html.slice(0, start) + `window.__remixContext.streamController.enqueue(${serialized})` + html.slice(end);
}
