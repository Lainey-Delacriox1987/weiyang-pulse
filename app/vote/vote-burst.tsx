"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export type VoteBurstData = { id: string; team: string; demo: boolean };

const videos = ["/videos/rocket.mp4", "/videos/flower.mp4"];

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_video;
  uniform vec2 u_texel;
  uniform float u_flower;
  varying vec2 v_texCoord;

  float colorDistance(vec3 a, vec3 b) {
    vec3 delta = abs(a - b);
    return max(delta.r, max(delta.g, delta.b));
  }

  void main() {
    vec2 uv = v_texCoord;
    vec3 color = texture2D(u_video, uv).rgb;
    vec2 jump = u_texel * 5.0;
    float detail = max(
      max(colorDistance(color, texture2D(u_video, uv + vec2(jump.x, 0.0)).rgb), colorDistance(color, texture2D(u_video, uv - vec2(jump.x, 0.0)).rgb)),
      max(colorDistance(color, texture2D(u_video, uv + vec2(0.0, jump.y)).rgb), colorDistance(color, texture2D(u_video, uv - vec2(0.0, jump.y)).rgb))
    );

    float brightness = max(color.r, max(color.g, color.b));
    float visibleColor = smoothstep(0.10, 0.24, brightness);

    vec2 bloomShape = (uv - vec2(0.50, 0.58)) / vec2(0.235, 0.36);
    vec2 stemShape = (uv - vec2(0.45, 0.27)) / vec2(0.14, 0.27);
    float subjectZone = max(
      1.0 - smoothstep(0.86, 1.08, length(bloomShape)),
      1.0 - smoothstep(0.86, 1.08, length(stemShape))
    );
    float subjectOutline = smoothstep(0.025, 0.15, detail) * subjectZone;
    float alpha = max(visibleColor, subjectOutline);

    alpha *= mix(1.0, subjectZone, u_flower);

    float redLead = color.r - color.g;
    float greenLead = color.g - color.b;
    float warmHue = smoothstep(0.015, 0.09, redLead) * smoothstep(-0.01, 0.075, greenLead);
    float yellowFamily = smoothstep(0.035, 0.16, min(color.r, color.g) - color.b);
    warmHue = max(warmHue, yellowFamily);
    float radialDistance = length(vec2((uv.x - 0.50) * 1.22, uv.y - 0.48));
    float outsideCore = smoothstep(0.08, 0.20, radialDistance);
    vec2 flowerShape = (uv - vec2(0.52, 0.70)) / vec2(0.20, 0.20);
    float flowerCore = 1.0 - smoothstep(0.80, 1.08, length(flowerShape));
    float protectedDetail = smoothstep(0.035, 0.16, detail) * subjectZone;
    float normalWarmRemoval = warmHue * outsideCore * (1.0 - protectedDetail * 0.92);
    float flowerWarmRemoval = warmHue * outsideCore * (1.0 - flowerCore * 0.98);
    float yellowBackdrop = mix(normalWarmRemoval, flowerWarmRemoval, u_flower);
    alpha *= 1.0 - yellowBackdrop * 0.98;

    float smoothRegion = 1.0 - smoothstep(0.018, 0.09, detail);
    float coolPaper = max(smoothstep(0.025, 0.14, color.b - color.r), smoothstep(0.025, 0.14, color.b - color.g));
    vec2 bowShape = (uv - vec2(0.48, 0.25)) / vec2(0.13, 0.18);
    float bowCore = 1.0 - smoothstep(0.78, 1.08, length(bowShape));
    float keepFlatArtwork = max(flowerCore, max(coolPaper, bowCore));
    float smoothFlowerBackdrop = smoothRegion * (1.0 - keepFlatArtwork);
    alpha *= 1.0 - u_flower * smoothFlowerBackdrop * 0.995;

    gl_FragColor = vec4(color, alpha);
  }
`;

function pickVideo(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return videos[hash % videos.length];
}

function makeShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function prepareRenderer(canvas: HTMLCanvasElement, video: HTMLVideoElement, isFlower: boolean) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;
  const vertexShader = makeShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = makeShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1,
    -1, 1, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1,
  ]), gl.STATIC_DRAW);
  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const position = gl.getAttribLocation(program, "a_position");
  const texCoord = gl.getAttribLocation(program, "a_texCoord");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(texCoord);
  gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  const texel = gl.getUniformLocation(program, "u_texel");
  gl.uniform1f(gl.getUniformLocation(program, "u_flower"), isFlower ? 1 : 0);
  const render = () => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(texel, 1 / canvas.width, 1 / canvas.height);
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const dispose = () => {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  };
  return { render, dispose };
}

export default function VoteBurst({ burst }: { burst: VoteBurstData | null }) {
  const [visible, setVisible] = useState(false);
  const [reduced,setReduced] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const src = useMemo(() => (burst ? pickVideo(burst.id) : null), [burst?.id]);

  useEffect(() => {
    if (!burst || !src) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);setVisible(true);
      const timer=window.setTimeout(()=>setVisible(false),3450);
      return()=>window.clearTimeout(timer);
    }
    setReduced(false);
    const isFlower = src.includes("flower");
    if (isFlower) {
      setVisible(true);
      const visibleTimer = window.setTimeout(() => setVisible(false), 3450);
      return () => window.clearTimeout(visibleTimer);
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const renderer = prepareRenderer(canvas, video, false);
    if (!renderer) return;

    setVisible(true);
    video.currentTime = 0;
    void video.play().catch(() => setVisible(false));
    video.addEventListener("loadeddata", renderer.render);
    video.addEventListener("timeupdate", renderer.render);
    const frameTimer = window.setInterval(renderer.render, 34);
    const visibleTimer = window.setTimeout(() => setVisible(false), 3450);
    return () => {
      video.removeEventListener("loadeddata", renderer.render);
      video.removeEventListener("timeupdate", renderer.render);
      window.clearInterval(frameTimer);
      window.clearTimeout(visibleTimer);
      renderer.dispose();
      video.pause();
    };
  }, [burst?.id, src]);

  if (!burst || !src) return null;
  const isFlower = src.includes("flower");
  return <>
    <div className={`vote-burst ${visible ? "is-visible" : ""}`} style={reduced?{display:"none"}:undefined} key={`${burst.id}-effect`} aria-hidden="true">
      {reduced ? null : isFlower ? <>
        <img className="vote-burst-flower" src="/effects/flower-cutout.png" alt="" />
        <div className="vote-flower-petals">{Array.from({ length: 72 }, (_, index) => <i key={index} style={{
          "--petal-x": `${(index % 12) * 8.4 + ((index * 7) % 6)}%`,
          "--petal-y": `${Math.floor(index / 12) * 18 - 18 + ((index * 11) % 13)}%`,
          "--petal-size": `${10 + ((index * 7) % 12)}px`,
          "--petal-drift": `${((index * 17) % 35) - 17}vw`,
          "--petal-turn": `${(index * 137) % 360}deg`,
          "--petal-delay": `${(index % 8) * 0.035}s`,
        } as CSSProperties}/>)}</div>
      </> : <>
        <video ref={videoRef} className="vote-burst-source" src={src} autoPlay preload="auto" muted playsInline onEnded={() => setVisible(false)} onError={() => setVisible(false)} />
        <canvas ref={canvasRef} className="vote-burst-canvas is-rocket" />
      </>}
    </div>
    <div className={`vote-burst-copy-layer ${visible ? "is-visible" : ""}`} key={`${burst.id}-copy`} aria-live="polite">
      <small>{burst.demo ? "PREVIEW EFFECT" : "NEW VOTE"}</small>
      <strong>{burst.team}</strong>
      <span>{burst.demo ? "演示支持已送达" : "服务器已确认这一票"}</span>
      <small>AI 生成庆祝素材 · 仅视觉反馈</small>
      <button className="celebration-dismiss" onClick={()=>{setVisible(false);videoRef.current?.pause();}}>跳过特效</button>
    </div>
  </>;
}
