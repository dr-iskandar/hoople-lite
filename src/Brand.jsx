import React from 'react';
import hoopleLogo from '../hoople-wordmark.png';

/** Keep the official Hoople wordmark intact and layer "lite" as a product label. */
export default function Brand(){return <span className="brand brand-hoople" aria-label="Hoople lite"><span className="brand-lockup"><span className="brand-lite">lite</span><img src={hoopleLogo} alt="Hoople" draggable="false" /></span></span>}
