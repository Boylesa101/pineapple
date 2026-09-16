import './style.css'
import { isInsideNimiqPay, connectHostWallet, payoutStake, isValidAddress, shortAddress } from './nimiq-wallet.js'

// The provider flag is injected before page scripts run, so it's safe to
// read once here rather than re-checking on every render.
const NIMIQ_PAY_AVAILABLE = isInsideNimiqPay()

// ---------------------------------------------------------------------------
// Icons (small hand-drawn stroke set, currentColor)
// ---------------------------------------------------------------------------
function icon(name, size){
  size = size || 18;
  const s = 'width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    radio: '<path d="M4 11.5 19 4"/><circle cx="9" cy="16" r="5"/><path d="M9 16h.01"/><path d="M17 11a5 5 0 0 1 1 3"/><path d="M20 9a8 8 0 0 1 1.5 5"/>',
    users: '<circle cx="8.5" cy="9" r="3"/><path d="M2.5 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M15.5 8a3 3 0 0 1 0 6"/><path d="M15 13.6c2.6.4 4.5 2.4 4.5 5.4"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    trophy: '<path d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z"/><path d="M7 5H4a3 3 0 0 0 3 5"/><path d="M17 5h3a3 3 0 0 1-3 5"/><path d="M12 13v3"/><path d="M9 20h6"/><path d="M10 20c0-2 .8-2.5 2-3.5 1.2 1 2 1.5 2 3.5"/>',
    back: '<path d="M14 6 8 12l6 6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    sliders: '<path d="M5 21V13"/><path d="M5 9V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M19 21v-5"/><path d="M19 12V3"/><circle cx="5" cy="11" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="19" cy="14" r="2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    wallet: '<path d="M20 12V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M20 12h-3.5a2 2 0 0 0 0 4H20"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  };
  return '<svg ' + s + '>' + (paths[name] || '') + '</svg>';
}

// ---------------------------------------------------------------------------
// Game data & pure logic
// ---------------------------------------------------------------------------
const PALETTE = [
  { id:0, name:'Amber',  hex:'#E0A458' },
  { id:1, name:'Teal',   hex:'#4FB7A6' },
  { id:2, name:'Rose',   hex:'#D9667A' },
  { id:3, name:'Violet', hex:'#9B7FD4' },
  { id:4, name:'Lime',   hex:'#A8C24C' },
  { id:5, name:'Cyan',   hex:'#5CC8E0' },
  { id:6, name:'Coral',  hex:'#E0785C' },
  { id:7, name:'Slate',  hex:'#8593A6' },
];

function colorFor(id){ return PALETTE.find(function(c){ return c.id === id; }); }

function generateSecret(settings){
  const pool = PALETTE.slice(0, settings.numColors).map(function(c){ return c.id; });
  if (settings.allowDuplicates){
    const out = [];
    for (let i=0;i<settings.codeLength;i++){ out.push(pool[Math.floor(Math.random()*pool.length)]); }
    return out;
  }
  const shuffled = pool.slice().sort(function(){ return Math.random()-0.5; });
  return shuffled.slice(0, settings.codeLength);
}

function scoreGuess(guess, secret){
  const len = secret.length;
  let exact = 0;
  const secretRemain = [], guessRemain = [];
  for (let i=0;i<len;i++){
    if (guess[i] === secret[i]) exact++;
    else { secretRemain.push(secret[i]); guessRemain.push(guess[i]); }
  }
  let partial = 0;
  const counts = {};
  secretRemain.forEach(function(c){ counts[c] = (counts[c]||0)+1; });
  guessRemain.forEach(function(c){ if (counts[c] > 0){ partial++; counts[c]--; } });
  return { exact: exact, partial: partial };
}

function loadBest(){
  try { const v = localStorage.getItem('frequency_best_solo'); return v ? parseInt(v,10) : null; }
  catch(e){ return null; }
}
function saveBestIfBetter(n){
  try {
    const cur = loadBest();
    if (cur === null || n < cur){ localStorage.setItem('frequency_best_solo', String(n)); }
  } catch(e){ /* storage unavailable — skip silently */ }
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}
function shortHash(hash){
  if (!hash) return '';
  return hash.length <= 16 ? hash : hash.slice(0,8) + '…' + hash.slice(-8);
}
function generateRoundId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = { codeLength:4, numColors:6, maxGuesses:10, allowDuplicates:true };

function createInitialWagerState(){
  return {
    stakeNim: 5,
    hostAddress: null,
    challengerAddressRaw: '',
    roundId: null,
    connecting: false,
    connectError: null,
    payoutStatus: 'idle', // idle | pending | success | error
    payoutTxHash: null,
    payoutError: null,
  };
}

let state = {
  screen: 'menu',
  mode: null,
  settings: Object.assign({}, DEFAULT_SETTINGS),
  secret: [],
  guesses: [],
  currentGuess: [],
  gameResult: null,
  setterPlayer: 1,
  matchRound: 1,
  scores: { 1:null, 2:null },
  setterCode: [],
  wager: createInitialWagerState(),
};

function guesser(){ return state.setterPlayer === 1 ? 2 : 1; }

function resetToMenu(){
  state = {
    screen:'menu', mode:null, settings: state.settings,
    secret:[], guesses:[], currentGuess:[], gameResult:null,
    setterPlayer:1, matchRound:1, scores:{1:null,2:null}, setterCode:[],
    wager: createInitialWagerState()
  };
  render();
}

function startSolo(){
  state.mode = 'solo';
  state.secret = generateSecret(state.settings);
  state.guesses = [];
  state.currentGuess = [];
  state.gameResult = null;
  state.screen = 'playing';
  render();
}

function startVersus(){
  state.mode = 'versus';
  state.setterPlayer = 1;
  state.matchRound = 1;
  state.scores = { 1:null, 2:null };
  state.setterCode = [];
  state.guesses = [];
  state.currentGuess = [];
  state.screen = 'versus-setup';
  render();
}

function startWager(){
  state.mode = 'wager';
  state.wager = createInitialWagerState();
  state.setterCode = [];
  state.guesses = [];
  state.currentGuess = [];
  state.gameResult = null;
  state.screen = NIMIQ_PAY_AVAILABLE ? 'wager-connect' : 'wager-unavailable';
  render();
}

async function connectWallet(){
  const w = state.wager;
  w.connecting = true;
  w.connectError = null;
  render();
  try {
    const address = await connectHostWallet();
    w.hostAddress = address;
    w.connecting = false;
    state.screen = 'wager-stake';
  } catch (err) {
    w.connecting = false;
    w.connectError = err instanceof Error ? err.message : String(err);
  }
  render();
}

function continueToSetup(){
  if (!isValidAddress(state.wager.challengerAddressRaw)) return;
  state.wager.roundId = generateRoundId();
  state.setterCode = [];
  state.screen = 'wager-setup';
  render();
}

function sealWagerSignal(){
  if (state.setterCode.length !== state.settings.codeLength) return;
  state.secret = state.setterCode.slice();
  state.setterCode = [];
  state.screen = 'wager-handoff';
  render();
}

async function approvePayout(){
  const w = state.wager;
  w.payoutStatus = 'pending';
  w.payoutError = null;
  render();
  try {
    const txHash = await payoutStake({
      recipient: w.challengerAddressRaw,
      amountNim: w.stakeNim,
      memo: 'FREQUENCY:' + w.roundId,
    });
    w.payoutStatus = 'success';
    w.payoutTxHash = txHash;
  } catch (err) {
    w.payoutStatus = 'error';
    w.payoutError = err instanceof Error ? err.message : String(err);
  }
  render();
}

function pickForSetter(id){
  if (state.setterCode.length >= state.settings.codeLength) return;
  if (!state.settings.allowDuplicates && state.setterCode.indexOf(id) !== -1) return;
  state.setterCode.push(id);
  render();
}
function removeSetterPeg(i){ state.setterCode.splice(i,1); render(); }
function beginDecoding(){
  state.guesses = [];
  state.currentGuess = [];
  state.screen = 'playing';
  render();
}

function pickForGuess(id){
  if (state.currentGuess.length >= state.settings.codeLength) return;
  if (!state.settings.allowDuplicates && state.currentGuess.indexOf(id) !== -1) return;
  state.currentGuess.push(id);
  render();
}
function removeGuessPeg(i){ state.currentGuess.splice(i,1); render(); }
function clearGuess(){ state.currentGuess = []; render(); }

function submitGuess(){
  if (state.currentGuess.length !== state.settings.codeLength) return;
  const r = scoreGuess(state.currentGuess, state.secret);
  state.guesses.push({ code: state.currentGuess.slice(), exact:r.exact, partial:r.partial });
  state.currentGuess = [];

  const cracked = r.exact === state.settings.codeLength;
  const outOfScans = state.guesses.length >= state.settings.maxGuesses;

  if (!cracked && !outOfScans){ render(); return; }

  if (state.mode === 'solo'){
    state.gameResult = cracked ? { status:'won', guesses: state.guesses.length } : { status:'lost' };
    if (cracked) saveBestIfBetter(state.guesses.length);
    state.screen = 'gameover';
    render();
    return;
  }

  if (state.mode === 'wager'){
    state.gameResult = cracked ? { status:'won', guesses: state.guesses.length } : { status:'lost' };
    state.screen = cracked ? 'wager-cracked' : 'wager-safe';
    render();
    return;
  }

  const roundScore = cracked ? state.guesses.length : state.settings.maxGuesses + 1;
  state.scores[guesser()] = roundScore;
  state.gameResult = cracked ? { status:'won', guesses: state.guesses.length } : { status:'lost' };
  state.screen = state.matchRound === 1 ? 'versus-round-result' : 'versus-final';
  render();
}

function continueToRoundTwo(){
  state.setterPlayer = guesser();
  state.matchRound = 2;
  state.secret = [];
  state.setterCode = [];
  state.guesses = [];
  state.currentGuess = [];
  state.gameResult = null;
  state.screen = 'versus-setup';
  render();
}

function updateSetting(key, value){
  state.settings[key] = value;
  if (!state.settings.allowDuplicates && state.settings.numColors < state.settings.codeLength){
    state.settings.numColors = state.settings.codeLength;
  }
  render();
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function pegHTML(colorId, opts){
  opts = opts || {};
  const size = opts.size || 30;
  const color = (colorId === undefined || colorId === null) ? null : colorFor(colorId);
  const classes = ['peg'];
  if (color) classes.push('filled'); else if (opts.placeholder) classes.push('placeholder');
  const bg = color ? ('radial-gradient(circle at 32% 28%, ' + color.hex + ', ' + color.hex + 'CC 60%, #00000055)') : 'transparent';
  const clickAttr = opts.onclick ? (' data-click="' + opts.onclick + '"') : '';
  return '<button type="button" class="' + classes.join(' ') + '" style="width:' + size + 'px;height:' + size + 'px;background:' + bg + '"' + clickAttr + (opts.onclick ? '' : ' disabled') + '></button>';
}

function feedbackHTML(exact, partial, total){
  const empties = Math.max(0, total - exact - partial);
  let html = '<div class="feedback">';
  let idx = 0;
  for (let i=0;i<exact;i++){ html += '<span class="fb-pip exact" style="animation-delay:' + (idx*55) + 'ms">' + icon('target',8) + '</span>'; idx++; }
  for (let i=0;i<partial;i++){ html += '<span class="fb-pip partial" style="animation-delay:' + (idx*55) + 'ms">' + icon('circle',8) + '</span>'; idx++; }
  for (let i=0;i<empties;i++){ html += '<span class="fb-pip empty" style="animation-delay:' + (idx*55) + 'ms"></span>'; idx++; }
  html += '</div>';
  return html;
}

function ledRowHTML(total, used){
  const remaining = Math.max(0, total - used);
  let html = '<div class="led-row">';
  for (let i=0;i<total;i++){
    const lit = i < remaining;
    const warn = lit && remaining <= 3;
    html += '<span class="led' + (lit ? ' lit' : '') + (warn ? ' warn' : '') + '"></span>';
  }
  html += '</div>';
  return html;
}

function paletteHTML(disabledFull, disabledIds){
  disabledIds = disabledIds || [];
  let html = '<div class="palette">';
  PALETTE.slice(0, state.settings.numColors).forEach(function(c){
    const blocked = disabledFull || disabledIds.indexOf(c.id) !== -1;
    html += '<button type="button" class="swatch" ' + (blocked ? 'disabled' : '') +
      ' data-pick="' + c.id + '" title="' + c.name + '" aria-label="Select ' + c.name + '"' +
      ' style="background:linear-gradient(160deg,' + c.hex + ',' + c.hex + 'CC)"></button>';
  });
  html += '</div>';
  return html;
}

function currentRowHTML(arr, removeFnName){
  let html = '<div class="current-row">';
  for (let i=0;i<state.settings.codeLength;i++){
    const has = arr[i] !== undefined;
    html += pegHTML(arr[i], { placeholder:true, onclick: has ? (removeFnName + '(' + i + ')') : null });
  }
  html += '</div>';
  return html;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function screenMenu(){
  const best = loadBest();
  return (
    '<div class="brand">' + icon('radio',22) +
      '<div><div class="title">Frequency</div>' +
      '<div class="subtitle">Crack the hidden signal before you run out of scans.</div></div>' +
    '</div>' +
    '<div class="mode-list">' +
      '<button class="mode-card" data-action="startSolo">' + icon('cpu',18) +
        '<div><div class="mode-title">Play solo</div>' +
        '<div class="mode-desc">Decode a signal the device generates</div>' +
        (best ? '<div class="mode-best">Best: ' + best + ' scan' + (best===1?'':'s') + '</div>' : '') +
        '</div></button>' +
      '<button class="mode-card" data-action="startVersus">' + icon('users',18) +
        '<div><div class="mode-title">Challenge a friend</div>' +
        '<div class="mode-desc">Take turns hiding and decoding on one device</div></div></button>' +
      '<button class="mode-card" data-action="startWager">' + icon('coins',18) +
        '<div><div class="mode-title">Wager NIM</div>' +
        '<div class="mode-desc">Host vs Challenger — stake real NIM on the outcome</div>' +
        '<div class="mode-tag">' + (NIMIQ_PAY_AVAILABLE ? 'Uses your Nimiq Pay wallet' : 'Open inside Nimiq Pay to unlock') + '</div>' +
        '</div></button>' +
    '</div>' +
    '<button class="settings-toggle" data-action="openSettings">' + icon('sliders',13) + ' Game settings</button>' +
    '<div class="how">' +
      '<div class="how-row"><span class="fb-pip exact fb-static">' + icon('target',9) + '</span>right color, right slot</div>' +
      '<div class="how-row"><span class="fb-pip partial fb-static">' + icon('circle',9) + '</span>right color, wrong slot</div>' +
    '</div>'
  );
}

function screenSettings(){
  const s = state.settings;
  const minColors = s.allowDuplicates ? 4 : s.codeLength;
  return (
    '<div class="panel-header"><button class="icon-btn" data-action="backToMenu">' + icon('back',15) + '</button>' +
      '<div class="panel-title">Game settings</div></div>' +
    stepperRow('Signal length', s.codeLength, 3, 6, 'codeLength') +
    stepperRow('Signal colors', s.numColors, minColors, 8, 'numColors') +
    stepperRow('Scans allowed', s.maxGuesses, 6, 14, 'maxGuesses') +
    '<label class="toggle-row"><span>Allow repeated colors in the signal</span>' +
      '<span class="switch"><input type="checkbox" ' + (s.allowDuplicates ? 'checked' : '') + ' data-toggle="allowDuplicates">' +
      '<span class="switch-track"></span><span class="switch-thumb"></span></span></label>' +
    '<button class="btn btn-primary" data-action="backToMenu">Done</button>'
  );
}
function stepperRow(label, value, min, max, key){
  return '<div class="stepper-row"><span>' + label + '</span><div class="stepper">' +
    '<button ' + (value<=min?'disabled':'') + ' data-step="' + key + ':' + Math.max(min,value-1) + '">−</button>' +
    '<span class="stepper-value">' + value + '</span>' +
    '<button ' + (value>=max?'disabled':'') + ' data-step="' + key + ':' + Math.min(max,value+1) + '">+</button>' +
    '</div></div>';
}

function screenVersusSetup(){
  const full = state.setterCode.length === state.settings.codeLength;
  return (
    '<div class="panel-header"><div class="panel-title">Player ' + state.setterPlayer + ' — hide a signal' +
      '<span class="round-tag">Round ' + state.matchRound + ' of 2</span></div></div>' +
    '<div class="hint">Player ' + guesser() + ', look away.</div>' +
    currentRowHTML(state.setterCode, 'removeSetterPeg') +
    paletteHTML(full, state.settings.allowDuplicates ? [] : state.setterCode) +
    '<div class="actions">' +
      '<button class="btn btn-ghost" data-action="clearSetter" ' + (state.setterCode.length===0?'disabled':'') + '>Clear</button>' +
      '<button class="btn btn-primary" data-action="sealSignal" ' + (full?'':'disabled') + '>Seal signal</button>' +
    '</div>'
  );
}

function screenHandoff(){
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:10px;flex:1;justify-content:center;">' +
    icon('radio',26) +
    '<div class="title">Signal sealed</div>' +
    '<div class="subtitle">Pass the device to Player ' + guesser() + '. ' + state.settings.maxGuesses + ' scans to crack it.</div>' +
    '<button class="btn btn-primary" data-action="beginDecoding" style="margin-top:6px;">Player ' + guesser() + ', start decoding</button>' +
  '</div>';
}

function screenPlaying(){
  const s = state.settings;
  const full = state.currentGuess.length === s.codeLength;
  const rows = state.guesses.slice().reverse().map(function(g, ri){
    const i = state.guesses.length - ri;
    let pegsHtml = '<div class="board-pegs">';
    g.code.forEach(function(c){ pegsHtml += pegHTML(c, { size:22 }); });
    pegsHtml += '</div>';
    return '<div class="board-row"><span class="board-index">' + i + '</span>' + pegsHtml + feedbackHTML(g.exact, g.partial, s.codeLength) + '</div>';
  }).join('');
  let title, roundTag = '';
  if (state.mode === 'solo'){ title = 'Decoding an unknown signal'; }
  else if (state.mode === 'wager'){ title = 'Challenger decoding'; roundTag = '<span class="round-tag">Stake: ' + state.wager.stakeNim + ' NIM</span>'; }
  else { title = 'Player ' + guesser() + ' decoding'; roundTag = '<span class="round-tag">Round ' + state.matchRound + ' of 2</span>'; }
  return (
    '<div class="panel-header"><div class="panel-title">' + title + roundTag + '</div></div>' +
    ledRowHTML(s.maxGuesses, state.guesses.length) +
    '<div class="board">' + (state.guesses.length===0 ? '<div class="board-empty">No scans logged yet — place a guess below.</div>' : rows) + '</div>' +
    currentRowHTML(state.currentGuess, 'removeGuessPeg') +
    paletteHTML(full, s.allowDuplicates ? [] : state.currentGuess) +
    '<div class="actions">' +
      '<button class="btn btn-ghost" data-action="clearGuess" ' + (state.currentGuess.length===0?'disabled':'') + '>Clear</button>' +
      '<button class="btn btn-primary" data-action="submitGuess" ' + (full?'':'disabled') + '>Lock in guess</button>' +
    '</div>'
  );
}

function revealRowHTML(){
  let html = '<div class="current-row reveal-row">';
  state.secret.forEach(function(c){ html += pegHTML(c, { size:40 }); });
  html += '</div>';
  return html;
}

function screenGameOver(){
  const won = state.gameResult && state.gameResult.status === 'won';
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;justify-content:center;">' +
    '<div class="title">' + (won ? 'Signal decoded' : 'Signal lost') + '</div>' +
    '<div class="subtitle">' + (won ? ('Cracked it in ' + state.gameResult.guesses + ' scan' + (state.gameResult.guesses===1?'':'s') + '.') : ('All ' + state.settings.maxGuesses + ' scans used without a match.')) + '</div>' +
    '<div class="reveal-label">The signal was</div>' + revealRowHTML() +
    '<div class="actions" style="width:100%;margin-top:8px;">' +
      '<button class="btn btn-ghost" data-action="backToMenu">' + icon('reset',13) + ' Main menu</button>' +
      '<button class="btn btn-primary" data-action="startSolo">Play again</button>' +
    '</div>' +
  '</div>';
}

function screenVersusRoundResult(){
  const won = state.gameResult && state.gameResult.status === 'won';
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;justify-content:center;">' +
    '<div class="title">' + (won ? 'Signal decoded' : 'Signal lost') + '</div>' +
    '<div class="subtitle">Player ' + guesser() + ' ' + (won ? ('cracked it in ' + state.gameResult.guesses + ' scan' + (state.gameResult.guesses===1?'':'s') + '.') : ('couldn’t crack it in ' + state.settings.maxGuesses + ' scans.')) + '</div>' +
    '<div class="reveal-label">The signal was</div>' + revealRowHTML() +
    '<button class="btn btn-primary" data-action="continueToRoundTwo" style="margin-top:6px;">Continue — Player ' + (state.setterPlayer===1?2:1) + ' sets the next signal</button>' +
  '</div>';
}

function screenVersusFinal(){
  const s1 = state.scores[1], s2 = state.scores[2];
  let winnerText;
  if (s1 === s2) winnerText = 'It’s a draw';
  else winnerText = (s1 < s2) ? 'Player 1 wins' : 'Player 2 wins';
  const won = state.gameResult && state.gameResult.status === 'won';
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;justify-content:center;">' +
    icon('trophy',24) +
    '<div class="title">' + winnerText + '</div>' +
    '<div class="subtitle">Player ' + guesser() + ' ' + (won ? ('cracked the last signal in ' + state.gameResult.guesses + ' scans.') : 'couldn’t crack the last signal.') + '</div>' +
    '<div class="score-table">' +
      '<div class="score-row"><span>Player 1</span><b>' + (s1 > state.settings.maxGuesses ? 'Not cracked' : s1 + ' scans') + '</b></div>' +
      '<div class="score-row"><span>Player 2</span><b>' + (s2 > state.settings.maxGuesses ? 'Not cracked' : s2 + ' scans') + '</b></div>' +
    '</div>' +
    '<div class="reveal-label">Final signal</div>' + revealRowHTML() +
    '<button class="btn btn-primary" data-action="backToMenu" style="margin-top:6px;">' + icon('reset',13) + ' New match</button>' +
  '</div>';
}

// --- wager screens ---------------------------------------------------------

function screenWagerUnavailable(){
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:10px;flex:1;justify-content:center;">' +
    icon('radio',24) +
    '<div class="title">Wager mode needs Nimiq Pay</div>' +
    '<div class="subtitle">Open Frequency inside the Nimiq Pay app to connect a wallet and wager real NIM. Solo and local Challenge modes work anywhere.</div>' +
    '<button class="btn btn-ghost" data-action="backToMenu" style="margin-top:6px;">Back to menu</button>' +
  '</div>';
}

function screenWagerConnect(){
  const w = state.wager;
  let banner;
  if (w.connecting){
    banner = '<div class="status-banner info"><span class="spinner"></span> Waiting for wallet confirmation…</div>';
  } else if (w.connectError){
    banner = '<div class="status-banner error">' + escapeHtml(w.connectError) + '</div>';
  } else {
    banner = '<div class="status-banner info">Only the wallet connected in this Nimiq Pay session can sign the payout. Connect it to continue as Host.</div>';
  }
  return '<div class="panel-header"><button class="icon-btn" data-action="backToMenu">' + icon('back',15) + '</button>' +
    '<div class="panel-title">Wager NIM<span class="round-tag">Host connects first</span></div></div>' +
    banner +
    '<button class="btn btn-primary" data-action="connectWallet" ' + (w.connecting?'disabled':'') + '>' + icon('wallet',14) + ' Connect Nimiq Pay wallet</button>' +
    '<div class="hint">You’ll pick a stake next, then the Challenger enters the address that gets paid if they crack your code.</div>';
}

function screenWagerStake(){
  const w = state.wager;
  return '<div class="panel-header"><button class="icon-btn" data-action="backToMenu">' + icon('back',15) + '</button>' +
    '<div class="panel-title">Set your stake<span class="round-tag">Host</span></div></div>' +
    '<div class="wallet-card">' + icon('wallet',16) +
      '<div><div class="wallet-role">Host wallet connected</div><div class="wallet-address">' + shortAddress(w.hostAddress) + '</div></div></div>' +
    '<div class="stake-display"><div class="stake-value">' + w.stakeNim + '</div><div class="stake-unit">NIM AT STAKE</div></div>' +
    '<div class="stepper-row"><span>Adjust stake</span><div class="stepper">' +
      '<button ' + (w.stakeNim<=1?'disabled':'') + ' data-step="stakeNim:' + Math.max(1,w.stakeNim-1) + '">−</button>' +
      '<span class="stepper-value">' + w.stakeNim + '</span>' +
      '<button ' + (w.stakeNim>=100?'disabled':'') + ' data-step="stakeNim:' + Math.min(100,w.stakeNim+1) + '">+</button>' +
    '</div></div>' +
    '<div class="hint">This only moves if the Challenger cracks your code — and only after you approve it live.</div>' +
    '<button class="btn btn-primary" data-action="continueToChallenger" style="margin-top:auto;">Continue</button>';
}

function screenWagerChallenger(){
  const w = state.wager;
  const raw = w.challengerAddressRaw;
  const trimmed = raw.trim();
  const valid = trimmed.length > 0 && isValidAddress(trimmed);
  const showError = trimmed.length > 0 && !valid;
  return '<div class="panel-header"><button class="icon-btn" data-action="backToMenu">' + icon('back',15) + '</button>' +
    '<div class="panel-title">Challenger’s address<span class="round-tag">Stake: ' + w.stakeNim + ' NIM</span></div></div>' +
    '<div class="hint">Enter the Nimiq address that gets paid if the Challenger cracks the signal. Capture it now, before they play.</div>' +
    '<div><div class="field-label">Challenger payout address</div>' +
      '<input class="field-input' + (showError?' invalid':'') + '" data-field="challengerAddress" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="NQ07 0000 0000 0000 0000 0000 0000 0000 0000" value="' + escapeHtml(raw) + '" />' +
      '<div class="field-error">' + (showError ? 'That doesn’t look like a valid Nimiq address.' : '') + '</div>' +
    '</div>' +
    '<button class="btn btn-primary" data-action="continueToSetup" ' + (valid?'':'disabled') + ' style="margin-top:auto;">Continue</button>';
}

function screenWagerSetup(){
  const full = state.setterCode.length === state.settings.codeLength;
  return '<div class="panel-header"><div class="panel-title">Host — hide the signal' +
      '<span class="round-tag">Stake: ' + state.wager.stakeNim + ' NIM</span></div></div>' +
    '<div class="hint">The Challenger looks away until you’re done.</div>' +
    currentRowHTML(state.setterCode, 'removeSetterPeg') +
    paletteHTML(full, state.settings.allowDuplicates ? [] : state.setterCode) +
    '<div class="actions">' +
      '<button class="btn btn-ghost" data-action="clearSetter" ' + (state.setterCode.length===0?'disabled':'') + '>Clear</button>' +
      '<button class="btn btn-primary" data-action="sealWagerSignal" ' + (full?'':'disabled') + '>Seal signal</button>' +
    '</div>';
}

function screenWagerHandoff(){
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:10px;flex:1;justify-content:center;">' +
    icon('radio',26) +
    '<div class="title">Signal sealed</div>' +
    '<div class="subtitle">Pass the device to the Challenger. ' + state.settings.maxGuesses + ' scans to crack it and win ' + state.wager.stakeNim + ' NIM.</div>' +
    '<button class="btn btn-primary" data-action="beginDecoding" style="margin-top:6px;">Challenger, start decoding</button>' +
  '</div>';
}

function screenWagerCracked(){
  const g = state.gameResult;
  const w = state.wager;
  let payoutBlock;
  if (w.payoutStatus === 'success'){
    payoutBlock = '<div class="status-banner success">Payout sent — <b>' + w.stakeNim + ' NIM</b> to the Challenger.' +
      '<div class="readout" style="margin-top:4px;">tx ' + shortHash(w.payoutTxHash) + '</div></div>';
  } else if (w.payoutStatus === 'error'){
    payoutBlock = '<div class="status-banner error">Payout not sent: ' + escapeHtml(w.payoutError || 'unknown error') + '</div>' +
      '<button class="btn btn-primary" data-action="approvePayout">Host: retry payout</button>';
  } else if (w.payoutStatus === 'pending'){
    payoutBlock = '<div class="status-banner info"><span class="spinner"></span> Waiting for Host approval in Nimiq Pay…</div>';
  } else {
    payoutBlock = '<div class="status-banner info">Hand the device back to the Host to approve the payout of <b>' + w.stakeNim + ' NIM</b>.</div>' +
      '<button class="btn btn-primary" data-action="approvePayout">Host: approve payout</button>';
  }
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;justify-content:center;">' +
    icon('radio',26) +
    '<div class="title">Signal decoded</div>' +
    '<div class="subtitle">The Challenger cracked it in ' + g.guesses + ' scan' + (g.guesses===1?'':'s') + '.</div>' +
    '<div class="reveal-label">The signal was</div>' + revealRowHTML() +
    payoutBlock +
    (w.payoutStatus === 'success' ? '<button class="btn btn-ghost" data-action="backToMenu" style="margin-top:6px;">New wager</button>' : '') +
  '</div>';
}

function screenWagerSafe(){
  return '<div class="centered" style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;justify-content:center;">' +
    '<div class="title">Signal held</div>' +
    '<div class="subtitle">The Challenger used all ' + state.settings.maxGuesses + ' scans without a match. The stake never left the Host’s wallet.</div>' +
    '<div class="reveal-label">The signal was</div>' + revealRowHTML() +
    '<button class="btn btn-primary" data-action="backToMenu" style="margin-top:6px;">' + icon('reset',13) + ' New wager</button>' +
  '</div>';
}

// ---------------------------------------------------------------------------
// Render + event delegation
// ---------------------------------------------------------------------------
function render(){
  const el = document.getElementById('screen');
  const map = {
    menu: screenMenu,
    settings: screenSettings,
    'versus-setup': screenVersusSetup,
    'versus-handoff': screenHandoff,
    playing: screenPlaying,
    gameover: screenGameOver,
    'versus-round-result': screenVersusRoundResult,
    'versus-final': screenVersusFinal,
    'wager-unavailable': screenWagerUnavailable,
    'wager-connect': screenWagerConnect,
    'wager-stake': screenWagerStake,
    'wager-challenger': screenWagerChallenger,
    'wager-setup': screenWagerSetup,
    'wager-handoff': screenWagerHandoff,
    'wager-cracked': screenWagerCracked,
    'wager-safe': screenWagerSafe,
  };
  el.innerHTML = (map[state.screen] || screenMenu)();
}

document.getElementById('screen').addEventListener('click', function(e){
  const actionEl = e.target.closest('[data-action]');
  if (actionEl){
    const action = actionEl.getAttribute('data-action');
    const fns = {
      startSolo: startSolo, startVersus: startVersus, startWager: startWager,
      openSettings: function(){ state.screen='settings'; render(); },
      backToMenu: resetToMenu, sealSignal: function(){
        if (state.setterCode.length !== state.settings.codeLength) return;
        state.secret = state.setterCode.slice();
        state.setterCode = [];
        state.screen = 'versus-handoff';
        render();
      },
      clearSetter: function(){ state.setterCode=[]; render(); },
      beginDecoding: beginDecoding, clearGuess: clearGuess, submitGuess: submitGuess,
      continueToRoundTwo: continueToRoundTwo,
      connectWallet: connectWallet,
      continueToChallenger: function(){ state.screen = 'wager-challenger'; render(); },
      continueToSetup: continueToSetup,
      sealWagerSignal: sealWagerSignal,
      approvePayout: approvePayout,
    };
    if (fns[action]) fns[action]();
    return;
  }
  const pickEl = e.target.closest('[data-pick]');
  if (pickEl){
    const id = parseInt(pickEl.getAttribute('data-pick'), 10);
    if (state.screen === 'versus-setup' || state.screen === 'wager-setup') pickForSetter(id); else pickForGuess(id);
    return;
  }
  const clickEl = e.target.closest('[data-click]');
  if (clickEl){
    const expr = clickEl.getAttribute('data-click');
    const m = expr.match(/^(\w+)\((\d+)\)$/);
    if (m){ ({ removeSetterPeg: removeSetterPeg, removeGuessPeg: removeGuessPeg })[m[1]](parseInt(m[2],10)); }
    return;
  }
  const stepEl = e.target.closest('[data-step]');
  if (stepEl){
    const parts = stepEl.getAttribute('data-step').split(':');
    const key = parts[0], value = parseInt(parts[1],10);
    if (key === 'stakeNim'){ state.wager.stakeNim = value; render(); }
    else updateSetting(key, value);
    return;
  }
});
document.getElementById('screen').addEventListener('change', function(e){
  if (e.target.matches('[data-toggle]')){
    updateSetting(e.target.getAttribute('data-toggle'), e.target.checked);
  }
});
document.getElementById('screen').addEventListener('input', function(e){
  if (e.target.matches('[data-field="challengerAddress"]')){
    state.wager.challengerAddressRaw = e.target.value;
    const cursor = e.target.selectionStart;
    render();
    const el = document.querySelector('[data-field="challengerAddress"]');
    if (el){ el.focus(); el.setSelectionRange(cursor, cursor); }
  }
});

render();
