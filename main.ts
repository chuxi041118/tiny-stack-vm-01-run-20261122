// Tiny stack VM: runs each program.bin on its input.bin; writes stdout.bin + exit.txt.
import { mkdirSync, readdirSync, readFileSync as rf, writeFileSync as wf } from 'node:fs';
// Opcode table: charCodeAt(op)-32 packs imm + pops*8 + pushes*32; unknown bytes read as 0.
const T = ' AD(hp\x90\x98        PPPPPPPHPPPHPPP PPP             "**"            H0              ((@(';
function run(p, inp) {
  const S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), O = new Uint8Array(65536);
  let sp = 0, cp = 0, ol = 0, pc = 0, ip = 0, st = 0;
  const n = p.length, end = c => [O.slice(0, ol), c];
  for (;;) {
    if (st === 1e6) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = p[pc];
    const t = T.charCodeAt(op) - 32, im = t & 7, po = (t >> 3) & 3, pu = t >> 5, bin = po === 2 && pu === 1;
    if (pc + im >= n) return end(9);
    st++;
    const nx = pc + 1 + im;
    if (sp < po) return end(2);
    if (sp - po + pu > 256) return end(3);
    pc = nx;
    switch (op) {
      case 0: return end(0);
      case 1: S[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 2: S[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 3: sp--; break;
      case 4: S[sp] = S[sp - 1]; sp++; break;
      case 5: { const w = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = w; break; }
      case 6: S[sp] = S[sp - 2]; sp++; break;
      case 7: { const a = S[sp - 3]; S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = a; break; }
      case 23: S[sp - 1] = -S[sp - 1] | 0; break;
      case 27: S[sp - 1] = ~S[sp - 1]; break;
      case 48: case 49: case 50: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) { const v = S[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 51:
        if (cp === 64) return end(7);
        C[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 52:
        if (cp === 0) return end(8);
        pc = C[--cp];
        break;
      case 64: {
        const a = S[sp - 1];
        if (a < 0 || a > 255) return end(6);
        S[sp - 1] = M[a];
        break;
      }
      case 65: {
        const a = S[sp - 1], v = S[sp - 2];
        if (a < 0 || a > 255) return end(6);
        sp -= 2;
        M[a] = v;
        break;
      }
      case 80: {
        const s = String(S[sp - 1]);
        if (ol + s.length > 65536) return end(11);
        sp--;
        for (let i = 0; i < s.length; i++) O[ol++] = s.charCodeAt(i);
        break;
      }
      case 81:
        if (ol + 1 > 65536) return end(11);
        O[ol++] = S[--sp] & 255;
        break;
      case 82: S[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 83: return end(S[--sp] & 255);
      default: {
        if (!bin) return end(5);
        const b = S[sp - 1], a = S[sp - 2];
        let r;
        if (op >= 19 && op <= 22) {
          if (!b) return end(4);
          r = op === 19 ? (a === -2147483648 && b === -1 ? a : (a / b) | 0)
            : op === 20 ? (b === -1 ? 0 : (a % b) | 0)
            : op === 21 ? Math.floor((a >>> 0) / (b >>> 0)) | 0
            : ((a >>> 0) % (b >>> 0)) | 0;
        } else r = op === 16 ? (a + b) | 0 : op === 17 ? (a - b) | 0 : op === 18 ? Math.imul(a, b)
          : op === 24 ? a & b : op === 25 ? a | b : op === 26 ? a ^ b
          : op === 28 ? a << (b & 31) : op === 29 ? a >> (b & 31) : op === 30 ? (a >>> (b & 31)) | 0
          : op === 32 ? (a === b ? 1 : 0) : op === 33 ? (a < b ? 1 : 0) : (a >>> 0) < (b >>> 0) ? 1 : 0;
        S[sp - 2] = r; sp--;
        break;
      }
    }
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const [o, c] = run(rf(I + '/' + id + '/program.bin'), rf(I + '/' + id + '/input.bin'));
  mkdirSync(O + '/' + id, { recursive: true });
  wf(O + '/' + id + '/stdout.bin', o);
  wf(O + '/' + id + '/exit.txt', c + '\n');
}
