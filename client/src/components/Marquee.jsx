import { Aperture, Box, CircleDot, Command, Hexagon, Layers, Orbit } from "lucide-react";

const logos = [
  { name: "NORTHWIND", icon: Hexagon },
  { name: "HELIOS", icon: Aperture },
  { name: "QUANTA", icon: Box },
  { name: "POLARIS", icon: CircleDot },
  { name: "VERTEX", icon: Layers },
  { name: "CIRRUS", icon: Orbit },
  { name: "OBSIDIAN", icon: Command },
];

function LogoRow() {
  return (
    <div className="logo-row">
      {logos.map(({ name, icon: Icon }) => (
        <div className="logo-item" key={name}>
          <Icon size={17} strokeWidth={1.4} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <section className="logo-section" aria-label="Trusted by leading teams">
      <div className="container-wide logo-section-inner">
        <span className="logo-kicker mono-label">
          ENGINEERED FOR TEAMS ELIMINATING TOOL FRAGMENTATION &amp; WORKFLOW OVERHEAD
        </span>
        <div className="marquee">
          <div className="marquee-fade marquee-fade--left" />
          <div className="marquee-track">
            <LogoRow />
            <LogoRow />
            <LogoRow />
          </div>
          <div className="marquee-fade marquee-fade--right" />
        </div>
      </div>
    </section>
  );
}
