import { Bodies, Body, Composite, Engine, Events, Render, Runner } from "matter-js";

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const center = { x: canvas.width / 2, y: canvas.height / 2 };

const engine = Engine.create({ gravity: { x: 0, y: 0 } });
const render = Render.create({ canvas, engine, options: { width: canvas.width, height: canvas.width } });
const runner = Runner.create();

Render.run(render);
Runner.run(runner, engine);

const box = Bodies.rectangle(center.x, center.y, 100, 100);
Composite.add(engine.world, box);

Events.on(engine, "beforeUpdate", () => {
  Body.rotate(box, 0.01);
})