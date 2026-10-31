import { useRef } from "react";

export default function Tilt3D({
  children,
  className = "",
  max = 9,
  scale = 1.012,
  glare = true,
  style,
  ...rest
}) {
  const ref = useRef(null);

  const onPointerMove = (event) => {
    const element = ref.current;
    if (!element) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const rect = element.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    element.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
    element.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
    element.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
    element.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
    element.style.setProperty("--gx", `${(px * 100).toFixed(2)}%`);
    element.style.setProperty("--gy", `${(py * 100).toFixed(2)}%`);
    element.style.setProperty("--tilt-scale", scale);
    element.classList.add("is-tilting");
  };

  const onPointerLeave = () => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
    element.style.setProperty("--tilt-scale", 1);
    element.classList.remove("is-tilting");
  };

  return (
    <div
      ref={ref}
      className={`tilt3d ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={style}
      {...rest}
    >
      {glare && <span className="tilt-glare" aria-hidden="true" />}
      {children}
    </div>
  );
}
