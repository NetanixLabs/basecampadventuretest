import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
const pair = () => { const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 }); return { pub: publicKey.export({ type: "spki", format: "pem" }), priv: privateKey.export({ type: "pkcs8", format: "pem" }) }; };
fs.writeFileSync(new URL("./keys.json", import.meta.url), JSON.stringify({ apiKey: "TESTAPIKEY123", officeId: "9104050000", merchSign: pair(), merchEnc: pair(), pacoEnc: pair(), pacoSign: pair() }, null, 1));
console.log("keys written");
