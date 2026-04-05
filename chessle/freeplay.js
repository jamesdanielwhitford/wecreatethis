// Chessle - Free Play mode
// Move pieces for both sides, see threats (red) and best move (blue)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chessle/sw.js', { scope: '/chessle/' })
    .catch(err => console.error('SW registration failed:', err));
}

// --- Constants ---

const PIECES = {
  king: '♚', queen: '♛', rook: '♜',
  bishop: '♝', knight: '♞', pawn: '♟'
};

// Piece values for evaluation
const PIECE_VALUE = {
  pawn: 100, knight: 320, bishop: 330,
  rook: 500, queen: 900, king: 20000
};

// Piece-square tables (from white's perspective, row 0 = rank 8)
const PST = {
  pawn: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  knight: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  bishop: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  rook: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
  ],
  queen: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  king: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

const initialBoardState = [
  [
    { color: 'black', type: 'rook' }, { color: 'black', type: 'knight' },
    { color: 'black', type: 'bishop' }, { color: 'black', type: 'queen' },
    { color: 'black', type: 'king' }, { color: 'black', type: 'bishop' },
    { color: 'black', type: 'knight' }, { color: 'black', type: 'rook' }
  ],
  Array(8).fill(null).map(() => ({ color: 'black', type: 'pawn' })),
  Array(8).fill(null), Array(8).fill(null),
  Array(8).fill(null), Array(8).fill(null),
  Array(8).fill(null).map(() => ({ color: 'white', type: 'pawn' })),
  [
    { color: 'white', type: 'rook' }, { color: 'white', type: 'knight' },
    { color: 'white', type: 'bishop' }, { color: 'white', type: 'queen' },
    { color: 'white', type: 'king' }, { color: 'white', type: 'bishop' },
    { color: 'white', type: 'knight' }, { color: 'white', type: 'rook' }
  ]
];

// --- State ---

let boardState = cloneBoard(initialBoardState);
let selectedSquare = null;
let currentTurn = 'white'; // whose turn it is
let boardFlipped = false;  // true = black at bottom
let showThreats = true;
let showBestMove = true;
let autoPlayColor = null; // 'white' | 'black' | null — which color the engine plays automatically
let bestMoveResult = null;  // { from: {row,col}, to: {row,col} } or null
let isCalculating = false;
let gameOver = false; // 'checkmate' | 'stalemate' | false

// En passant: column of pawn that just double-advanced, or null
// Only valid for one ply - cleared after every move
let enPassantCol = null;

// Castling rights: track whether king and each rook have moved
let castlingRights = {
  white: { kingSide: true, queenSide: true },
  black: { kingSide: true, queenSide: true }
};

// --- DOM ---

const chessBoard = document.getElementById('chess-board');
const turnIndicator = document.getElementById('turn-indicator');
const fpStatus = document.getElementById('fp-status');
const engineSection = document.getElementById('engine-section');
const engineName = document.getElementById('engine-name');
const engineStatus = document.getElementById('engine-status');
const bottomName = document.getElementById('bottom-name');
const fpResetBtn = document.getElementById('fp-reset-btn');
const fpHintBtn = document.getElementById('fp-hint-btn');
const fpFlipBtn = document.getElementById('fp-flip-btn');
const fpMenuBtn = document.getElementById('fp-menu-btn');
const fpMenuDropdown = document.getElementById('fp-menu-dropdown');
const fpToggleThreatsBtn = document.getElementById('fp-toggle-threats-btn');
const fpToggleBestMoveBtn = document.getElementById('fp-toggle-bestmove-btn');
const fpAutoplayOffBtn = document.getElementById('fp-autoplay-off-btn');
const fpAutoplayBlackBtn = document.getElementById('fp-autoplay-black-btn');
const fpAutoplayWhiteBtn = document.getElementById('fp-autoplay-white-btn');
const fpNewBtn = document.getElementById('fp-new-btn');

// --- Board Utilities ---

function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// --- Legal Move Generation ---
// Returns array of { fromRow, fromCol, toRow, toCol }

function getLegalMovesForColor(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const targets = getTargetSquares(board, r, c, color, true);
        for (const t of targets) {
          moves.push({ fromRow: r, fromCol: c, toRow: t.row, toCol: t.col });
        }
      }
    }
  }
  return moves;
}

// Get squares a piece can legally move to (filters moves that leave king in check)
function getTargetSquares(board, row, col, color, filterCheck) {
  const piece = board[row][col];
  if (!piece) return [];

  const raw = getRawMoves(board, row, col);
  if (!filterCheck) return raw;

  const opp = color === 'white' ? 'black' : 'white';

  return raw.filter(t => {
    // Castling: king must not be in check, and must not pass through an attacked square
    if (t.castle) {
      if (isKingInCheck(board, color)) return false;
      const passCol = t.castle === 'kingSide' ? 5 : 3;
      const kingRow = color === 'white' ? 7 : 0;
      const oppAttacks = getAttackedSquares(board, opp);
      if (oppAttacks.has(`${kingRow},${passCol}`)) return false;
      if (oppAttacks.has(`${kingRow},${t.col}`)) return false;
      return true;
    }
    // Normal move: must not leave own king in check
    const next = cloneBoard(board);
    next[t.row][t.col] = next[row][col];
    next[row][col] = null;
    return !isKingInCheck(next, color);
  });
}

// Generate raw (pseudo-legal) target squares for a piece
function getRawMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const { color, type } = piece;
  const opp = color === 'white' ? 'black' : 'white';
  const targets = [];

  function addIfValid(r, c) {
    if (!inBounds(r, c)) return false;
    const target = board[r][c];
    if (target && target.color === color) return false; // blocked by own piece
    targets.push({ row: r, col: c });
    return !target; // can continue sliding only if empty
  }

  switch (type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      // Forward
      if (inBounds(row + dir, col) && !board[row + dir][col]) {
        targets.push({ row: row + dir, col });
        // Double advance from start
        if (row === startRow && !board[row + 2 * dir][col]) {
          targets.push({ row: row + 2 * dir, col });
        }
      }
      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nr = row + dir;
        const nc = col + dc;
        if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].color === opp) {
          targets.push({ row: nr, col: nc });
        }
        // En passant
        const epRow = color === 'white' ? 3 : 4;
        if (row === epRow && enPassantCol === nc && inBounds(nr, nc) && !board[nr][nc]) {
          targets.push({ row: nr, col: nc, enPassant: true });
        }
      }
      break;
    }
    case 'knight': {
      const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of jumps) addIfValid(row + dr, col + dc);
      break;
    }
    case 'bishop': {
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        let r = row + dr, c = col + dc;
        while (addIfValid(r, c)) { r += dr; c += dc; }
      }
      break;
    }
    case 'rook': {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        let r = row + dr, c = col + dc;
        while (addIfValid(r, c)) { r += dr; c += dc; }
      }
      break;
    }
    case 'queen': {
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
        let r = row + dr, c = col + dc;
        while (addIfValid(r, c)) { r += dr; c += dc; }
      }
      break;
    }
    case 'king': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        addIfValid(row + dr, col + dc);
      }
      // Castling (only added as raw moves; legality filtered in getTargetSquares)
      const rights = castlingRights[color];
      const kingRow = color === 'white' ? 7 : 0;
      if (row === kingRow && col === 4) {
        // King-side: squares 5 and 6 must be empty
        if (rights.kingSide && !board[kingRow][5] && !board[kingRow][6]) {
          targets.push({ row: kingRow, col: 6, castle: 'kingSide' });
        }
        // Queen-side: squares 1, 2 and 3 must be empty
        if (rights.queenSide && !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3]) {
          targets.push({ row: kingRow, col: 2, castle: 'queenSide' });
        }
      }
      break;
    }
  }
  return targets;
}

// Get all squares attacked by a color (raw, no check filtering)
function getAttackedSquares(board, color) {
  const attacked = new Set();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getRawMoves(board, r, c);
        // For pawns, raw attack squares differ from raw moves
        if (piece.type === 'pawn') {
          const dir = color === 'white' ? -1 : 1;
          for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (inBounds(nr, nc)) attacked.add(`${nr},${nc}`);
          }
        } else {
          for (const t of moves) attacked.add(`${t.row},${t.col}`);
        }
      }
    }
  }
  return attacked;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'king') return { row: r, col: c };
    }
  }
  return null;
}

function isKingInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  const opp = color === 'white' ? 'black' : 'white';
  const attacked = getAttackedSquares(board, opp);
  return attacked.has(`${king.row},${king.col}`);
}

// Get threatened pieces: squares with friendly pieces that are attacked by the opponent
// Returns set of "row,col" strings for pieces of `color` that are under attack
function getThreatenedSquares(board, color) {
  const opp = color === 'white' ? 'black' : 'white';
  const oppAttacks = getAttackedSquares(board, opp);
  const threatened = new Set();
  for (const key of oppAttacks) {
    const [r, c] = key.split(',').map(Number);
    const piece = board[r][c];
    if (piece && piece.color === color) {
      threatened.add(key);
    }
  }
  return threatened;
}

// --- Board Evaluation ---

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = PIECE_VALUE[piece.type];
      const pstRow = piece.color === 'white' ? r : (7 - r);
      const pst = PST[piece.type][pstRow][c];
      if (piece.color === 'white') {
        score += val + pst;
      } else {
        score -= val + pst;
      }
    }
  }
  return score;
}

// Compute updated castling rights after a move (for engine simulation)
function updateRights(rights, board, fromRow, fromCol) {
  const piece = board[fromRow][fromCol];
  if (!piece) return rights;
  const r = JSON.parse(JSON.stringify(rights));
  if (piece.type === 'king') {
    r[piece.color].kingSide = false;
    r[piece.color].queenSide = false;
  }
  if (piece.type === 'rook') {
    if (fromCol === 7) r[piece.color].kingSide = false;
    if (fromCol === 0) r[piece.color].queenSide = false;
  }
  return r;
}

// --- Minimax with Alpha-Beta ---

const MAX_DEPTH = 3; // depth 3 is fast enough for client-side

function applyMoveToBoard(board, move) {
  const next = cloneBoard(board);
  // Handle castling rook move
  const piece = next[move.fromRow][move.fromCol];
  if (piece && piece.type === 'king' && move.fromCol === 4) {
    const kingRow = piece.color === 'white' ? 7 : 0;
    if (move.fromRow === kingRow) {
      if (move.toCol === 6) { next[kingRow][5] = next[kingRow][7]; next[kingRow][7] = null; }
      if (move.toCol === 2) { next[kingRow][3] = next[kingRow][0]; next[kingRow][0] = null; }
    }
  }
  // En passant: remove captured pawn
  const movingPiece = next[move.fromRow][move.fromCol];
  if (movingPiece && movingPiece.type === 'pawn' && move.enPassant) {
    next[move.fromRow][move.toCol] = null;
  }
  next[move.toRow][move.toCol] = next[move.fromRow][move.fromCol];
  next[move.fromRow][move.fromCol] = null;
  return next;
}

function minimax(board, depth, alpha, beta, maximizing) {
  const color = maximizing ? 'white' : 'black';
  const legalMoves = getLegalMovesForColor(board, color);

  if (depth === 0 || legalMoves.length === 0) {
    if (legalMoves.length === 0) {
      if (isKingInCheck(board, color)) {
        return maximizing ? -999999 + (MAX_DEPTH - depth) : 999999 - (MAX_DEPTH - depth);
      }
      return 0; // stalemate
    }
    return evaluateBoard(board);
  }

  if (maximizing) {
    let best = -Infinity;
    for (const move of legalMoves) {
      const next = applyMoveToBoard(board, move);
      const savedRights = castlingRights;
      const savedEP = enPassantCol;
      castlingRights = updateRights(castlingRights, board, move.fromRow, move.fromCol);
      const piece = board[move.fromRow][move.fromCol];
      enPassantCol = (piece && piece.type === 'pawn' && Math.abs(move.toRow - move.fromRow) === 2) ? move.toCol : null;
      const score = minimax(next, depth - 1, alpha, beta, false);
      castlingRights = savedRights;
      enPassantCol = savedEP;
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of legalMoves) {
      const next = applyMoveToBoard(board, move);
      const savedRights = castlingRights;
      const savedEP = enPassantCol;
      castlingRights = updateRights(castlingRights, board, move.fromRow, move.fromCol);
      const piece = board[move.fromRow][move.fromCol];
      enPassantCol = (piece && piece.type === 'pawn' && Math.abs(move.toRow - move.fromRow) === 2) ? move.toCol : null;
      const score = minimax(next, depth - 1, alpha, beta, true);
      castlingRights = savedRights;
      enPassantCol = savedEP;
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// Find the best move for `color` (returns { fromRow, fromCol, toRow, toCol } or null)
function findBestMove(board, color) {
  const legalMoves = getLegalMovesForColor(board, color);
  if (legalMoves.length === 0) return null;

  const maximizing = color === 'white';
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMove = null;

  for (const move of legalMoves) {
    const next = applyMoveToBoard(board, move);
    const savedRights = castlingRights;
    const savedEP = enPassantCol;
    castlingRights = updateRights(castlingRights, board, move.fromRow, move.fromCol);
    const piece = board[move.fromRow][move.fromCol];
    enPassantCol = (piece && piece.type === 'pawn' && Math.abs(move.toRow - move.fromRow) === 2) ? move.toCol : null;
    const score = minimax(next, MAX_DEPTH - 1, -Infinity, Infinity, !maximizing);
    castlingRights = savedRights;
    enPassantCol = savedEP;
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

// --- Rendering ---

function renderBoard() {
  chessBoard.innerHTML = '';
  updateEngineSection();
  updateHintBtn();

  // Compute overlays
  const threats = showThreats ? getThreatenedSquares(boardState, currentTurn) : new Set();
  const legalTargetSet = new Set();
  if (selectedSquare) {
    const targets = getTargetSquares(boardState, selectedSquare.row, selectedSquare.col, currentTurn, true);
    for (const t of targets) legalTargetSet.add(`${t.row},${t.col}`);
  }

  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const row = boardFlipped ? (7 - visualRow) : visualRow;
      const col = boardFlipped ? (7 - visualCol) : visualCol;

      const square = document.createElement('div');
      square.className = 'chess-square';

      const isLight = (row + col) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');
      square.dataset.row = row;
      square.dataset.col = col;

      // Selected
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      // Threatened
      if (threats.has(`${row},${col}`)) {
        square.classList.add('threatened');
      }

      // Best move
      if (showBestMove && bestMoveResult) {
        if (bestMoveResult.fromRow === row && bestMoveResult.fromCol === col) {
          square.classList.add('best-from');
        }
        if (bestMoveResult.toRow === row && bestMoveResult.toCol === col) {
          square.classList.add('best-to');
          if (!boardState[row][col]) square.classList.add('empty-target');
        }
      }

      const piece = boardState[row][col];
      if (piece) {
        const pieceSpan = document.createElement('span');
        pieceSpan.className = `chess-piece ${piece.color}`;
        pieceSpan.textContent = PIECES[piece.type];
        square.appendChild(pieceSpan);
      }

      // Legal move dot
      if (legalTargetSet.has(`${row},${col}`)) {
        const dot = document.createElement('div');
        dot.className = piece ? 'legal-capture-ring' : 'legal-dot';
        square.appendChild(dot);
      }

      square.addEventListener('click', () => handleSquareClick(row, col));
      chessBoard.appendChild(square);
    }
  }

  updateStatusUI();
}

function updateStatusUI() {
  if (gameOver === 'checkmate') {
    const winner = currentTurn === 'white' ? 'Black' : 'White';
    fpStatus.textContent = `Checkmate! ${winner} wins.`;
    fpStatus.className = 'fp-status checkmate';
    turnIndicator.textContent = 'Game Over';
  } else if (gameOver === 'stalemate') {
    fpStatus.textContent = 'Stalemate! Draw.';
    fpStatus.className = 'fp-status stalemate';
    turnIndicator.textContent = 'Game Over';
  } else {
    const inCheck = isKingInCheck(boardState, currentTurn);
    if (inCheck) {
      fpStatus.textContent = `${capitalize(currentTurn)} is in check!`;
      fpStatus.className = 'fp-status check';
    } else {
      fpStatus.textContent = '';
      fpStatus.className = 'fp-status';
    }
    turnIndicator.textContent = `${capitalize(currentTurn)} to move`;
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Move Handling ---

function handleSquareClick(row, col) {
  if (gameOver) return;

  // Clicking the best-move destination executes it directly
  if (bestMoveResult && !isCalculating &&
      bestMoveResult.toRow === row && bestMoveResult.toCol === col) {
    applyMove(bestMoveResult.fromRow, bestMoveResult.fromCol, row, col);
    return;
  }

  const clickedPiece = boardState[row][col];

  if (!selectedSquare) {
    // Select a piece belonging to current turn
    if (!clickedPiece || clickedPiece.color !== currentTurn) return;
    selectedSquare = { row, col };
    renderBoard();
    return;
  }

  // Click same square: deselect
  if (selectedSquare.row === row && selectedSquare.col === col) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  // Click another piece of same color: re-select
  if (clickedPiece && clickedPiece.color === currentTurn) {
    selectedSquare = { row, col };
    renderBoard();
    return;
  }

  // Attempt move - check it's a legal target
  const legalTargets = getTargetSquares(boardState, selectedSquare.row, selectedSquare.col, currentTurn, true);
  const isLegal = legalTargets.some(t => t.row === row && t.col === col);

  if (!isLegal) {
    // If clicking opponent piece but not a legal capture, just deselect
    selectedSquare = null;
    renderBoard();
    return;
  }

  // Apply move
  applyMove(selectedSquare.row, selectedSquare.col, row, col);
}

function applyMove(fromRow, fromCol, toRow, toCol) {
  const piece = boardState[fromRow][fromCol];
  const color = piece.color;
  const kingRow = color === 'white' ? 7 : 0;

  // Castling: also move the rook
  if (piece.type === 'king' && fromRow === kingRow && fromCol === 4) {
    if (toCol === 6) {
      boardState[kingRow][5] = boardState[kingRow][7];
      boardState[kingRow][7] = null;
    } else if (toCol === 2) {
      boardState[kingRow][3] = boardState[kingRow][0];
      boardState[kingRow][0] = null;
    }
  }

  // En passant: remove the captured pawn
  const isEnPassant = piece.type === 'pawn' && toCol === enPassantCol &&
    fromCol !== toCol && !boardState[toRow][toCol];
  if (isEnPassant) {
    boardState[fromRow][toCol] = null; // captured pawn is on the same row as the moving pawn
  }

  // Pawn promotion: auto-queen
  if (piece.type === 'pawn') {
    if ((color === 'white' && toRow === 0) || (color === 'black' && toRow === 7)) {
      boardState[toRow][toCol] = { color, type: 'queen' };
      boardState[fromRow][fromCol] = null;
    } else {
      boardState[toRow][toCol] = piece;
      boardState[fromRow][fromCol] = null;
    }
  } else {
    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = null;
  }

  // Update en passant state for next move
  if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
    enPassantCol = toCol; // this pawn just double-advanced
  } else {
    enPassantCol = null;
  }

  // Update castling rights
  if (piece.type === 'king') {
    castlingRights[color].kingSide = false;
    castlingRights[color].queenSide = false;
  }
  if (piece.type === 'rook') {
    if (fromCol === 7) castlingRights[color].kingSide = false;
    if (fromCol === 0) castlingRights[color].queenSide = false;
  }

  selectedSquare = null;
  bestMoveResult = null;

  // Switch turn
  currentTurn = currentTurn === 'white' ? 'black' : 'white';

  // Check game over
  const nextMoves = getLegalMovesForColor(boardState, currentTurn);
  if (nextMoves.length === 0) {
    if (isKingInCheck(boardState, currentTurn)) {
      gameOver = 'checkmate';
    } else {
      gameOver = 'stalemate';
    }
  }

  // Render the move first, then start thinking
  renderBoard();

  if (gameOver) return;

  if (autoPlayColor === currentTurn) {
    // Small delay so the player sees their move land before engine responds
    setTimeout(() => autoPlayNext(), 150);
  } else if (showBestMove) {
    computeBestMoveAsync();
  }
}

// Single source of truth for hint button state
function updateHintBtn() {
  if (gameOver) {
    fpHintBtn.disabled = true;
    fpHintBtn.textContent = 'Best Move';
  } else if (isCalculating) {
    fpHintBtn.disabled = true;
    fpHintBtn.textContent = autoPlayColor ? 'Best Move' : '...';
  } else if (bestMoveResult && !autoPlayColor) {
    fpHintBtn.disabled = false;
    fpHintBtn.textContent = 'Play It';
  } else {
    fpHintBtn.disabled = false;
    fpHintBtn.textContent = 'Best Move';
  }
}

// Compute best move in a short timeout to avoid blocking the UI thread
function computeBestMoveAsync() {
  isCalculating = true;
  updateHintBtn();

  setTimeout(() => {
    setTimeout(() => {
      bestMoveResult = findBestMove(boardState, currentTurn);
      isCalculating = false;
      updateHintBtn();
      renderBoard();
    }, 20);
  }, 0);
}

// Auto-play the engine's move for autoPlayColor
function autoPlayNext() {
  isCalculating = true;
  updateHintBtn();

  // Only show in top area if engine's color is at the top
  const topColor = boardFlipped ? 'white' : 'black';
  if (autoPlayColor === topColor) {
    engineStatus.textContent = 'Thinking...';
    engineStatus.className = 'opponent-status thinking';
  }

  setTimeout(() => {
    const move = findBestMove(boardState, currentTurn);
    isCalculating = false;
    updateHintBtn();
    engineStatus.textContent = '';
    engineStatus.className = 'opponent-status';
    if (move && !gameOver) {
      applyMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
    } else {
      renderBoard();
    }
  }, 20);
}

// --- Controls ---

function resetCastlingRights() {
  castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
  };
}

fpResetBtn.addEventListener('click', () => {
  boardState = cloneBoard(initialBoardState);
  currentTurn = 'white';
  selectedSquare = null;
  bestMoveResult = null;
  gameOver = false;
  enPassantCol = null;
  resetCastlingRights();
  updateHintBtn();
  if (showBestMove) {
    computeBestMoveAsync();
  } else {
    renderBoard();
  }
});

fpHintBtn.addEventListener('click', () => {
  if (gameOver || isCalculating) return;

  // If best move is already shown, execute it
  if (bestMoveResult && !isCalculating) {
    applyMove(bestMoveResult.fromRow, bestMoveResult.fromCol, bestMoveResult.toRow, bestMoveResult.toCol);
    return;
  }

  // Otherwise calculate it first, then show it (next click will execute)
  if (!isCalculating) {
    computeBestMoveAsync();
  }
});

fpFlipBtn.addEventListener('click', () => {
  boardFlipped = !boardFlipped;
  // If auto-play is on, keep it consistent (flip just lets you view from other side)
  renderBoard();
});

// Menu
fpMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isVisible = fpMenuDropdown.style.display !== 'none';
  fpMenuDropdown.style.display = isVisible ? 'none' : 'block';
});

document.addEventListener('click', () => {
  fpMenuDropdown.style.display = 'none';
});

fpToggleThreatsBtn.addEventListener('click', () => {
  showThreats = !showThreats;
  fpToggleThreatsBtn.textContent = showThreats ? 'Hide Threats' : 'Show Threats';
  fpMenuDropdown.style.display = 'none';
  renderBoard();
});

function setAutoPlay(color) {
  autoPlayColor = color;
  fpAutoplayOffBtn.textContent   = (!color)           ? '✓ Play Both Sides'    : '● Play Both Sides';
  fpAutoplayBlackBtn.textContent = (color === 'black') ? '✓ Engine plays Black' : '● Engine plays Black';
  fpAutoplayWhiteBtn.textContent = (color === 'white') ? '✓ Engine plays White' : '● Engine plays White';
  fpMenuDropdown.style.display = 'none';

  // Flip board so the human's pieces are always at the bottom
  boardFlipped = (color === 'white'); // engine plays white → human is black → flip
  updateEngineSection();
  renderBoard();

  if (autoPlayColor === currentTurn && !gameOver && !isCalculating) {
    autoPlayNext();
  }
}

function updateEngineSection() {
  const topColor = boardFlipped ? 'white' : 'black';
  const bottomColor = boardFlipped ? 'black' : 'white';
  const topSymbol = topColor === 'white' ? '♙' : '♟';
  const bottomSymbol = bottomColor === 'white' ? '♙' : '♟';

  // Top label
  engineName.textContent = autoPlayColor === topColor
    ? `Engine (${capitalize(topColor)}) ${topSymbol}`
    : `${capitalize(topColor)} ${topSymbol}`;
  engineName.style.opacity = (currentTurn === topColor) ? '1' : '0.35';

  // Bottom label
  if (autoPlayColor === bottomColor) {
    bottomName.textContent = `Engine (${capitalize(bottomColor)}) ${bottomSymbol}`;
  } else {
    bottomName.textContent = `${capitalize(bottomColor)} ${bottomSymbol}`;
  }
  bottomName.style.opacity = (currentTurn === bottomColor) ? '1' : '0.35';
}

fpAutoplayOffBtn.addEventListener('click', () => setAutoPlay(null));
fpAutoplayBlackBtn.addEventListener('click', () => setAutoPlay('black'));
fpAutoplayWhiteBtn.addEventListener('click', () => setAutoPlay('white'));

fpToggleBestMoveBtn.addEventListener('click', () => {
  showBestMove = !showBestMove;
  fpToggleBestMoveBtn.textContent = showBestMove ? 'Hide Best Move' : 'Show Best Move';
  fpMenuDropdown.style.display = 'none';
  if (showBestMove && !bestMoveResult && !gameOver) {
    computeBestMoveAsync();
  } else {
    renderBoard();
  }
});

fpNewBtn.addEventListener('click', () => {
  fpMenuDropdown.style.display = 'none';
  boardState = cloneBoard(initialBoardState);
  currentTurn = 'white';
  selectedSquare = null;
  bestMoveResult = null;
  gameOver = false;
  enPassantCol = null;
  resetCastlingRights();
  // If auto-play is on for white, kick it off immediately
  if (autoPlayColor === 'white' && !isCalculating) {
    autoPlayNext();
  } else if (showBestMove) {
    computeBestMoveAsync();
  } else {
    renderBoard();
  }
});

// --- Init ---

// Set initial autoplay button labels
fpAutoplayOffBtn.textContent = '✓ Play Both Sides';
updateEngineSection();

// Initial render
if (showBestMove) {
  computeBestMoveAsync();
} else {
  renderBoard();
}
