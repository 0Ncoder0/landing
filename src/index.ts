import _ from "lodash";
import Matter, { Bodies, Body, Composite, Engine, Events, Render, Runner, Vector } from "matter-js";

class Earth {
  public static edges = 16;
  public static radius = 400;
  public static mass = 10000;

  public body: Body;

  public center2edge: number;

  public effect = 700;

  constructor(x: number, y: number) {
    this.body = Bodies.circle(x, y, Earth.radius, { mass: Earth.mass, frictionAir: 0 }, Earth.edges);

    this.center2edge = Earth.radius * Math.cos((2 * Math.PI) / Earth.edges / 2);

    Body.setAngularVelocity(this.body, -0.001);
  }
}

class Moon {
  public static edges = 12;
  public static radius = 100;
  public static mass = Earth.mass / 24;

  public body: Body;

  public center2edge: number;

  public effect = 500;

  constructor(x: number, y: number) {
    this.body = Bodies.circle(x, y, Moon.radius, { mass: Moon.mass, frictionAir: 0 }, Moon.edges);

    this.center2edge = Moon.radius * Math.cos((2 * Math.PI) / Moon.edges / 2);

    Body.setAngularVelocity(this.body, -0.00001);
  }

  public orbit(target: Body, delta: number) {
    return () => {
      const angle = Vector.angle(target.position, this.body.position);
      const distance = Vector.magnitude(Vector.sub(this.body.position, target.position));
      const next = angle + delta;
      const x = target.position.x + distance * Math.cos(next);
      const y = target.position.y + distance * Math.sin(next);
      const velocity = Vector.mult(Vector.normalise(Vector.sub({ x, y }, this.body.position)), 0.1);
      Body.setVelocity(this.body, velocity);
    };
  }
}

class Ship {
  public static radius = 20;
  public static mass = 1;
  public static thrust = 0.00002;
  public static rotate = 0.007;

  public body: Body;
  public center2edge: number;

  public thrust = 0;

  public rotate = 0;

  constructor(x: number, y: number) {
    this.body = Bodies.polygon(x, y, 3, Ship.radius, { mass: Ship.mass, frictionAir: 0 });

    this.center2edge = Ship.radius * Math.cos((2 * Math.PI) / 3 / 2);

    Body.rotate(this.body, Math.PI / 2);
  }

  public render() {
    const { x, y } = this.body.position;
    const offset = this.center2edge;
    const angle = this.body.angle;
    const head = {
      x: x + Ship.radius * Math.cos(angle + Math.PI),
      y: y + Ship.radius * Math.sin(angle + Math.PI),
    };

    const tail = {
      x: x + (offset + 4) * Math.cos(angle),
      y: y + (offset + 4) * Math.sin(angle),
    };

    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(tail.x, tail.y);
    ctx.stroke();
    ctx.closePath();

    if (!this.thrust) return;
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, 6, 0, angle + Math.PI * 2);
    ctx.strokeStyle = "red";
    ctx.stroke();
    ctx.closePath();
  }

  public thrusting() {
    const angle = ship.body.angle;
    const fx = ship.thrust * Math.cos(angle);
    const fy = ship.thrust * Math.sin(angle);
    Body.applyForce(ship.body, ship.body.position, { x: -fx, y: -fy });
  }

  public rotating() {
    if (this.rotate) Body.setAngularVelocity(this.body, this.rotate);
  }

  public stopRotation() {
    this.rotate = 0;
    Body.setAngularVelocity(this.body, 0);
  }
}

const getGravityForce = (target: Body, other: Body): Vector => {
  const planet = earth.body === other ? earth : moon;

  const dx = other.position.x - target.position.x;
  const dy = other.position.y - target.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > planet.effect) return { x: 0, y: 0 };

  const force = ((target.mass * other.mass) / Math.pow(distance, 2)) * 0.0003;
  const angle = Math.atan2(dy, dx);

  const fx = force * Math.cos(angle);
  const fy = force * Math.sin(angle);

  return { x: fx, y: fy };
};

const gravity = () => {
  const bodies = Composite.allBodies(engine.world);

  bodies.forEach((target) => {
    if (target !== ship.body) return;
    bodies.forEach((other) => {
      if (target === other) return;
      Body.applyForce(target, target.position, getGravityForce(target, other));
    });
  });
};

const predict = () => {
  const tick = 1000 / 24;
  const steps = (100 * 1000) / tick;

  const target = new Ship(ship.body.position.x, ship.body.position.y).body;
  Object.assign(target, _.cloneDeep(ship.body));

  const path = [];

  const planets = [earth, moon];

  for (let i = 0; i < steps; i++) {
    planets.forEach((planet) => Body.applyForce(target, target.position, getGravityForce(target, planet.body)));

    Body.update(target, tick, 0, 0);
    Body.updateVelocities(target);

    target.force.x = 0;
    target.force.y = 0;
    target.torque = 0;

    const x = target.position.x;
    const y = target.position.y;

    if (planets.some((planet) => Vector.magnitude(Vector.sub({ x, y }, planet.body.position)) < planet.center2edge)) break;

    path.push({ x, y });
  }

  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  path.forEach(({ x, y }) => ctx.lineTo(x, y));
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.stroke();
  ctx.closePath();
};

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

const earth = new Earth(center.x, center.y);
Composite.add(engine.world, earth.body);

const moon = new Moon(center.x + 1000, center.y);
Composite.add(engine.world, moon.body);

const ship = new Ship(earth.body.position.x, earth.body.position.y - Earth.radius - Ship.radius + 16);
Composite.add(engine.world, ship.body);

Events.on(engine, "beforeUpdate", gravity);
Events.on(engine, "beforeUpdate", ship.thrusting.bind(ship));
Events.on(engine, "beforeUpdate", ship.rotating.bind(ship));
Events.on(engine, "beforeUpdate", moon.orbit(earth.body, -0.00001));

Events.on(render, "afterRender", ship.render.bind(ship));
Events.on(render, "afterRender", predict);
Events.on(render, "afterRender", () => {
  if (Matter.Collision.collides(moon.body, ship.body) === null) return;
  Runner.stop(runner);
  Render.stop(render);
  alert("You made it!");
});

window.addEventListener("keydown", (event) => {
  if (event.key !== " ") return;
  ship.thrust = ship.thrust ? 0 : Ship.thrust;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "a") ship.rotate = -Ship.rotate;
  if (event.key === "d") ship.rotate = Ship.rotate;
  if (event.key === "s") ship.stopRotation();
});

// 操作说明
const div = document.createElement("div");
div.style.position = "fixed";
div.style.top = "0";
div.style.right = "0";
div.style.padding = "10px";
div.style.color = "white";
div.style.zIndex = "999";

div.innerText = `
操作说明：
- 空格键：推进
- A 键：左转
- D 键：右转
- S 键：停止转向
`;

document.body.appendChild(div);
