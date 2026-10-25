"""Render the shipped paper GLSL with Mesa/EGL, without a browser or GPU readback in the site."""
import ctypes as c
import ctypes.util
import json
import sys

request = json.load(sys.stdin)
library = ctypes.util.find_library('EGL')
if not library:
    sys.exit(77)
egl = c.CDLL(library)
egl.eglGetProcAddress.argtypes = [c.c_char_p]
egl.eglGetProcAddress.restype = c.c_void_p


def entry(name, result, *args):
    pointer = egl.eglGetProcAddress(name.encode())
    if not pointer:
        raise RuntimeError('Missing GL entry: ' + name)
    return c.CFUNCTYPE(result, *args)(pointer)


def egl_entry(name, result, *args):
    fn = getattr(egl, name)
    fn.restype, fn.argtypes = result, list(args)
    return fn


platform = entry('eglGetPlatformDisplayEXT', c.c_void_p, c.c_uint, c.c_void_p, c.POINTER(c.c_int))
display = platform(0x31DD, None, None)
major, minor = c.c_int(), c.c_int()
if not egl_entry('eglInitialize', c.c_uint, c.c_void_p, c.POINTER(c.c_int), c.POINTER(c.c_int))(display, c.byref(major), c.byref(minor)):
    sys.exit(77)
egl_entry('eglBindAPI', c.c_uint, c.c_uint)(0x30A2)
attrs = (c.c_int * 13)(0x3033, 1, 0x3040, 8, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3038)
config, count = c.c_void_p(), c.c_int()
assert egl_entry('eglChooseConfig', c.c_uint, c.c_void_p, c.POINTER(c.c_int), c.POINTER(c.c_void_p), c.c_int, c.POINTER(c.c_int))(display, attrs, c.byref(config), 1, c.byref(count)) and count.value
width, height = 192, 128
surface_attrs = (c.c_int * 5)(0x3057, width, 0x3056, height, 0x3038)
surface = egl_entry('eglCreatePbufferSurface', c.c_void_p, c.c_void_p, c.c_void_p, c.POINTER(c.c_int))(display, config, surface_attrs)
context_attrs = (c.c_int * 7)(0x3098, 3, 0x30FB, 3, 0x30FD, 1, 0x3038)
context = egl_entry('eglCreateContext', c.c_void_p, c.c_void_p, c.c_void_p, c.c_void_p, c.POINTER(c.c_int))(display, config, None, context_attrs)
assert context and egl_entry('eglMakeCurrent', c.c_uint, c.c_void_p, c.c_void_p, c.c_void_p, c.c_void_p)(display, surface, surface, context)

uint, integer, void, char, floating = c.c_uint, c.c_int, None, c.c_char_p, c.c_float
shader_create = entry('glCreateShader', uint, uint)
shader_source = entry('glShaderSource', void, uint, integer, c.POINTER(char), c.POINTER(integer))
shader_compile = entry('glCompileShader', void, uint)
shader_state = entry('glGetShaderiv', void, uint, uint, c.POINTER(integer))
shader_log = entry('glGetShaderInfoLog', void, uint, integer, c.POINTER(integer), c.c_void_p)


def shader(kind, source):
    handle = shader_create(kind)
    encoded = char(source.encode())
    shader_source(handle, 1, c.byref(encoded), None)
    shader_compile(handle)
    success = integer()
    shader_state(handle, 0x8B81, c.byref(success))
    if not success.value:
        message = c.create_string_buffer(8192)
        shader_log(handle, 8192, None, message)
        raise RuntimeError(message.value.decode())
    return handle


vertex = shader(0x8B31, '''#version 330 core
out vec2 vUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.0-1.0,0,1);}
''')
fragment = shader(0x8B30, '''#version 330 core
in vec2 vUv;
out vec4 outColor;
''' + request['shader'] + '''
vec3 outputSRGB(vec3 v){return mix(1.055*pow(v,vec3(1.0/2.4))-0.055,12.92*v,lessThanEqual(v,vec3(0.0031308)));}
void main(){vec4 result;mainImage(vec4(0.03,0.06,0.09,1.0),vUv,result);outColor=vec4(outputSRGB(result.rgb),result.a);}
''')
program = entry('glCreateProgram', uint)()
attach = entry('glAttachShader', void, uint, uint)
attach(program, vertex)
attach(program, fragment)
entry('glLinkProgram', void, uint)(program)
linked = integer()
entry('glGetProgramiv', void, uint, uint, c.POINTER(integer))(program, 0x8B82, c.byref(linked))
assert linked.value, 'Paper program did not link'
entry('glUseProgram', void, uint)(program)
vao = uint()
entry('glGenVertexArrays', void, integer, c.POINTER(uint))(1, c.byref(vao))
entry('glBindVertexArray', void, uint)(vao)
texture = uint()
entry('glGenTextures', void, integer, c.POINTER(uint))(1, c.byref(texture))
entry('glBindTexture', void, uint, uint)(0x0DE1, texture)
for pname in [0x2800, 0x2801]:
    entry('glTexParameteri', void, uint, uint, integer)(0x0DE1, pname, 0x2600)
neutral = (c.c_ubyte * 4)(128, 128, 128, 255)
entry('glTexImage2D', void, uint, integer, integer, integer, integer, integer, uint, uint, c.c_void_p)(0x0DE1, 0, 0x8058, 1, 1, 0, 0x1908, 0x1401, neutral)
location = entry('glGetUniformLocation', integer, uint, char)
uniform1 = entry('glUniform1f', void, integer, floating)
entry('glUniform2f', void, integer, floating, floating)(location(program, b'uResolution'), width, height)
entry('glUniform3f', void, integer, floating, floating, floating)(location(program, b'uColor'), *request['color'])
entry('glViewport', void, integer, integer, integer, integer)(0, 0, width, height)
draw = entry('glDrawArrays', void, uint, integer, integer)
read = entry('glReadPixels', void, integer, integer, integer, integer, uint, uint, c.c_void_p)
pixels = (c.c_ubyte * (width * height * 4))()
results = []
for frame in request['frames']:
    if 'clear' in frame:
        entry('glClearColor', void, floating, floating, floating, floating)(*frame['clear'])
        entry('glClear', void, uint)(0x4000)
    else:
        uniform1(location(program, b'uPosition'), frame['position'])
        uniform1(location(program, b'uTime'), frame.get('time', 0))
        draw(0x0004, 0, 3)
    read(0, 0, width, height, 0x1908, 0x1401, pixels)
    samples = []
    for x, y in request.get('samples', [[0.5, 0.1], [0.5, 0.5], [0.5, 0.9]]):
        index = (int(y * height) * width + int(x * width)) * 4
        samples.append(list(pixels[index:index + 4]))
    results.append(samples)
renderer = entry('glGetString', char, uint)(0x1F01).decode()
print(json.dumps({'renderer': renderer, 'frames': results}))
egl_entry('eglMakeCurrent', c.c_uint, c.c_void_p, c.c_void_p, c.c_void_p, c.c_void_p)(display, None, None, None)
egl_entry('eglDestroyContext', c.c_uint, c.c_void_p, c.c_void_p)(display, context)
egl_entry('eglDestroySurface', c.c_uint, c.c_void_p, c.c_void_p)(display, surface)
egl_entry('eglTerminate', c.c_uint, c.c_void_p)(display)
