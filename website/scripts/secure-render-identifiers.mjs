import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {parse} from '@babel/parser';

export function hardenThreeUuid(source, functionName, modulePath) {
  const ast = parse(source, {sourceType: 'module'});
  const fn = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id?.name === functionName);
  if (!fn) throw new Error('Cannot locate the retained Three UUID generator: ' + functionName);
  const body = source.slice(fn.body.start, fn.body.end);
  if (body.includes('bumpSecureUUID()')) {
    const imported = ast.program.body.some(node => node.type === 'ImportDeclaration' &&
      node.source.value === modulePath && node.specifiers.some(specifier =>
        specifier.type === 'ImportSpecifier' && specifier.imported.name === 'createRendererUuid' &&
        specifier.local.name === 'bumpSecureUUID'));
    if (!imported) throw new Error('The retained UUID generator has no secure implementation');
    return source;
  }
  if (!/Math\.random\s*\(/.test(body) || !/\.toLowerCase\s*\(/.test(body)) {
    throw new Error('The retained Three UUID implementation changed; inspect before patching');
  }
  return `import {createRendererUuid as bumpSecureUUID} from ${JSON.stringify(modulePath)};\n` +
    source.slice(0, fn.body.start) + '{ return bumpSecureUUID(); }' + source.slice(fn.body.end);
}

// Apply at the dependency source boundary so rebuilding/minification never
// restores weak identifiers in the Globe bundle. Do not edit node_modules.
export function secureThreeIdentifiers() {
  return {name: 'bump-secure-three-identifiers', setup(builder) {
    builder.onLoad({filter: /[\\/]three[\\/]build[\\/]three\.core\.js$/}, args => ({
      contents: hardenThreeUuid(readFileSync(args.path, 'utf8'), 'generateUUID', resolve('src/bump/ui/secureUuid.js')),
      loader: 'js', resolveDir: dirname(args.path),
    }));
  }};
}

export function hardenRetainedIdentifiers() {
  for (const [file, name, modulePath] of [
    ['public/runtime/assets/Background-DpyJh-o1.js', 'Ai', '/runtime/secure-uuid.js'],
    ['public/runtime/key-three/build/three.module.js', 'generateUUID', '../../secure-uuid.js'],
  ]) {
    const source = readFileSync(file, 'utf8');
    const hardened = hardenThreeUuid(source, name, modulePath);
    if (hardened !== source) writeFileSync(file, hardened);
  }
}
