// CS405 Â· Lab 1 â€” your first triangle in WebGPU (starter)
// Work through the TODOs in order. After each one, check the matching
// checkpoint on the lab slides. The reference solution is in ../lab1-solution/.



const canvas = document.querySelector('canvas');
if (!navigator.gpu) throw new Error('WebGPU not available');

const adapter = await navigator.gpu.requestAdapter();
const device  = await adapter.requestDevice();

const ctx = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({ device, format, alphaMode: 'opaque' });
console.log('WebGPU ready:', format);

const SHADER = `
  struct U {
    time: f32,
    aspect: f32,
    pad: vec2f
  };

  @group(0) @binding(0) var<uniform> u: U;

  struct VSOut {
    @builtin(position) pos: vec4f,
    @location(0) colour: vec4f
  };

  @vertex
  fn vs(@builtin(vertex_index) i: u32) -> VSOut {

    // Square made from two triangles
    var p = array<vec2f, 6>(
      // triangle 1
      vec2f(-0.5,  0.5),   // top left
      vec2f(-0.5, -0.5),   // bottom left
      vec2f( 0.5, -0.5),   // bottom right

      // triangle 2
      vec2f(-0.5,  0.5),   // top left
      vec2f( 0.5, -0.5),   // bottom right
      vec2f( 0.5,  0.5)    // top right
    );

    var c = array<vec3f, 6>(
      vec3f(1.0 + u.pad.x, 0.0 + u.pad.y, 0.0),
      vec3f(0.0 + u.pad.x, 1.0 + u.pad.y, 0.0),
      vec3f(0.0 + u.pad.x, 0.0 + u.pad.y, 1.0),

      vec3f(1.0 + u.pad.x, 0.0 + u.pad.y, 0.0),
      vec3f(0.0 + u.pad.x, 0.0 + u.pad.y, 1.0),
      vec3f(1.0 + u.pad.x, 1.0 + u.pad.y, 0.0)
    );

   let distance = length(u.pad);
   let a = u.time - 1 + abs(distance);

    let q = vec2f(
      p[i].x * cos(a) - p[i].y * sin(a),
      p[i].x * sin(a) + p[i].y * cos(a)
    );


    var out: VSOut;
    out.pos = vec4f(q.x + u.pad.x, q.y + u.pad.y, 0.0, 1.0);
    out.colour = vec4f(c[i], 1.0);

    return out;
  }

  @fragment
  fn fs(in: VSOut) -> @location(0) vec4f {
    return in.colour;
  }
`;

const module = device.createShaderModule({ code: SHADER });

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs' },
  fragment: { module, entryPoint: 'fs', targets: [{ format }] }
});


const ubuf = device.createBuffer({
  size: 24,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});

const bind = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: ubuf } }]
});

// ---------------------------------------------------------------------------
// TODO 5 â€” your turn: a square (two triangles), correct aspect ratio,
//   and the shape following the mouse.
// ---------------------------------------------------------------------------

const t0 = performance.now();

let mousex = 0;
let mousey = 0;


window.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();

  mousex = ((e.clientX - r.left) / r.width) * 2 - 1;
  mousey = 1 - ((e.clientY - r.top) / r.height) * 2;

});

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
}
window.addEventListener('resize', resize);
resize();

function frame() {

  const t = (performance.now() - t0) * 0.001;

  device.queue.writeBuffer(ubuf, 0, new Float32Array([t, 0, mousex, mousey] ));

  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({ colorAttachments: [{
    view: ctx.getCurrentTexture().createView(),
    clearValue: { r: 0.19, g: 0.2, b: 0.6, a: 1 },
    loadOp: 'clear', storeOp: 'store' }] });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bind);
  pass.draw(6);
  pass.end();

  device.queue.submit([enc.finish()]);

  requestAnimationFrame(frame);
}
frame();