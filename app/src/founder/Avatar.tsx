import { initials } from './FounderSidebar';

/**
 * Example headshots for the seeded demo people only: illustrated DiceBear "notionists"
 * portraits (CC0) in public/avatars. Real applicants and the real founders in
 * seed/roles.json keep their initials, so nobody gets a made-up face.
 */
const DEMO = new Set([
  'candidate-demo-maya',
  'candidate-fixture-001',
  'candidate-demo-chloe',
  'candidate-demo-derek',
  'candidate-demo-kevin',
  'candidate-demo-jordan',
  'candidate-demo-tyler',
  'candidate-demo-ravi',
  'founder-demo-alex',
]);

/** The demo company's founder, so the rail footer can show Alex's portrait. */
export const founderAvatarId = (roleId?: string) => (roleId?.startsWith('role-demo') ? 'founder-demo-alex' : undefined);

// A stable pastel per name so line-art portraits read on light and dark surfaces.
function tint(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 86%)`;
}

export function Avatar({ id, name, size = 34, className = '' }: { id?: string; name: string; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (id && DEMO.has(id)) {
    return (
      <span className={`headshot ${className}`} style={{ ...style, background: tint(name) }} aria-hidden="true">
        <img src={`/avatars/${id}.svg`} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`headshot initials ${className}`} style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
