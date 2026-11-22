import { useState } from 'react';

// Logos from each company's Y Combinator page (ElevenLabs from its own site).
// Loaded from their CDNs; if one fails, the tile falls back to the company's initial.
const YC = 'https://bookface-images.s3.amazonaws.com/small_logos/';
const LOGOS: Record<string, string> = {
  TraceRoot: `${YC}2b960cd1912da7a2d242a9f8b16360d7fac3bed4.png`,
  ElevenLabs: 'https://elevenlabs.io/apple-icon.png',
  Wasp: `${YC}c0dfc65176d7169b24399e9ad69bc08681240583.png`,
  Codevisor: `${YC}681aa94a92bcc7782953966da553da33659dae28.png`,
  Maritime: `${YC}d8ff801ef7e9094077a292c8bed3e86ce7e01f00.png`,
  Alter: `${YC}3a30946452aaca1a7c8b4b8fefafd9807f194243.png`,
  'assistant-ui': `${YC}11f41b527f94c63e7d0ee1e19db038344f713a8f.png`,
  'Expected Parrot': `${YC}fb8df693185d3d01a607d26dc392fa6f5307be2a.png`,
  Ploid: `${YC}0818fc968494e08cc15fca10a1d1c43ca33aa3e0.png`,
  'Rowboat Labs': `${YC}8c4e76ac514dde1b24f29f53724cc0f032c90a91.png`,
  'Fiber AI': `${YC}e7118ffc006ccecf44fec5c8d5c5268024216181.png`,
};

export function CompanyLogo({ company }: { company: string }) {
  const src = LOGOS[company];
  const [failed, setFailed] = useState(false);
  return (
    <span className="co-logo" aria-hidden="true">
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <b>{company.replace(/\(.*\)/, '').trim()[0]}</b>}
    </span>
  );
}
