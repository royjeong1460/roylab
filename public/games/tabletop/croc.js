(() => {
  'use strict';

  const ink = '#174436';
  const teeth = [
    [94, 271, -24], [111, 343, -22], [151, 402, -16],
    [218, 431, -8], [300, 442, 0], [382, 431, 8],
    [449, 402, 16], [489, 343, 22], [506, 271, 24],
    [172, 264, -9], [428, 264, 9],
  ];

  function paint(canvas, draw) {
    canvas.width = 1200;
    canvas.height = 1040;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function path(shape, fill, stroke = ink, width = 6) {
      const p = new Path2D(shape);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill(p);
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke(p);
      }
    }
    function oval(x, y, rx, ry, fill, tilt = 0, stroke, width = 3) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, tilt, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }
    draw(path, oval);
  }

  function body(path) {
    path('M452 394 C507 373 536 330 549 277 Q560 232 568 201 Q574 176 591 160 C590 191 581 213 585 236 L591 249 L585 265 L591 280 L584 289 L587 303 L577 312 C565 376 531 411 473 425Z', '#62a74f');
    path('M526 369 Q566 329 573 279 M576 265 L578 252', null, '#b1d66c', 4);
    path('M97 365 C67 367 49 379 39 392 C28 402 27 409 36 411 L43 410 C32 418 36 426 47 424 L55 421 C52 430 59 433 71 427 C87 421 99 417 117 414Z', '#75ba58');
    path('M503 365 C533 367 551 379 561 392 C572 402 573 409 564 411 L557 410 C568 418 564 426 553 424 L545 421 C548 430 541 433 529 427 C513 421 501 417 483 414Z', '#75ba58');
    path('M44 402 L54 396 M51 415 L62 408 M556 402 L546 396 M549 415 L538 408', null, '#4c884b', 3);
  }

  function lowerJaw(path, oval) {
    path('M64 166 Q300 110 536 166 C571 232 556 350 511 415 C467 479 396 503 300 505 C203 503 132 479 89 415 C44 349 29 235 64 166Z', '#499a53');
    path('M55 185 C116 107 484 107 545 185 C573 236 550 341 501 403 C457 457 393 483 300 487 C207 483 143 457 99 403 C50 341 27 236 55 185Z', '#99d15e');
    path('M78 190 C139 145 461 145 522 190 C546 242 524 342 475 394 C438 434 378 459 300 462 C222 459 162 434 125 394 C76 342 54 242 78 190Z', '#ee9c8e', '#703e49', 5);
    path('M95 199 C160 153 440 153 505 199 C530 248 498 329 464 373 C428 414 368 435 300 438 C232 435 172 414 136 373 C102 329 70 248 95 199Z', '#793941', '#703e49', 4);
    path('M99 211 C165 161 443 163 504 211 Q512 245 493 282 C453 231 360 217 300 220 C229 215 155 233 107 282 Q89 240 99 211Z', '#63323c', null);
    path('M149 365 C144 318 196 292 248 302 Q282 308 299 321 C326 296 375 286 418 303 C459 319 473 344 448 375 C414 410 352 428 300 428 C248 428 190 410 149 365Z', '#ed807a', '#9a4b55', 4);
    path('M190 323 Q216 307 249 315', null, '#ffaca1', 7);
    path('M306 330 Q317 316 340 311', null, '#bf6266', 4);
    path('M134 436 Q169 458 207 466 M395 466 Q433 458 464 436', null, '#ccdf7a', 4);
    oval(226, 470, 5, 2.2, '#cfe888', .18);
    oval(375, 470, 5, 2.2, '#cfe888', -.18);
  }

  function upperJaw(path, oval) {
    path('M128 129 C129 96 146 61 177 51 C187 22 208 11 233 14 C260 15 281 33 292 53 Q302 50 313 53 C325 24 347 11 373 14 C398 15 421 32 430 57 C452 61 472 84 475 119 C512 120 542 142 548 173 C556 205 542 226 514 243 C478 263 421 251 374 249 Q300 261 226 249 C179 253 122 263 86 243 C58 227 44 204 52 173 C60 147 86 129 128 129Z', '#70b94f');
    path('M143 124 Q145 84 178 68 M435 71 Q460 81 462 109', null, '#9ad664', 6);
    path('M174 104 C170 65 190 40 218 39 C249 36 265 59 269 91 C270 110 256 122 222 128 C196 133 177 124 174 104Z', '#fff1c5', ink, 4.5);
    path('M331 92 C334 59 353 36 380 39 C409 41 426 65 424 101 C425 121 411 131 386 129 C359 127 330 116 331 92Z', '#fff1c5', ink, 4.5);
    oval(234, 88, 16, 22, '#213e32', -.1);
    oval(368, 88, 16, 22, '#213e32', .1);
    oval(239, 80, 5.2, 7, '#fffbe0');
    oval(373, 80, 5.2, 7, '#fffbe0');
    path('M190 48 Q200 35 214 32 M362 30 Q376 25 388 32', null, '#b8df7d', 4);
    path('M272 104 L282 92 L291 104 M294 91 L302 78 L312 91 M316 104 L326 94 L334 105', null, '#47934d', 3.5);

    path('M68 162 C82 135 109 123 141 122 C173 122 191 134 217 139 Q302 156 384 139 C409 134 429 120 461 122 C498 122 529 137 542 164 C557 198 544 227 515 243 C479 263 426 249 386 250 Q300 265 214 250 C168 252 120 261 86 243 C56 225 46 193 68 162Z', '#a2d967');
    path('M65 201 C83 228 110 232 153 231 Q191 228 226 232 Q300 246 376 232 C417 228 453 235 481 231 Q521 231 544 203 C540 223 528 236 510 244 C469 262 426 249 386 250 Q300 265 214 250 C172 250 121 261 87 243 Q64 227 60 209Z', '#72b857', null);
    path('M90 158 Q110 139 143 140 M152 141 L162 143', null, '#dbeb8e', 7);
    path('M459 140 Q487 140 507 155', null, '#c7e889', 5);
    oval(218, 176, 18, 12, '#408348', -.38);
    oval(382, 176, 18, 12, '#408348', .38);
    oval(218, 172, 14, 8, '#2b613e', -.38);
    oval(382, 172, 14, 8, '#2b613e', .38);
    path('M203 183 Q208 191 218 188 M383 188 Q394 191 398 183', null, '#bee886', 3.5);
    oval(110, 197, 24, 12, '#e4a575', -.10);
    oval(490, 197, 24, 12, '#e4a575', .10);
    for (const [x, y, r] of [[144,173,3],[156,179,2.8],[146,186,2],[454,173,3],[444,179,2.8],[454,186,2]]) {
      oval(x, y, r, r, '#589c4f');
    }
    path('M72 207 Q78 218 91 220 M528 207 Q522 218 509 220', null, '#447e45', 4);
    path('M253 221 Q261 224 270 223 M330 223 Q339 224 347 221', null, '#80bc5a', 3);
  }

  window.initCroc = function initCroc(root) {
    const stage = document.createElement('div');
    stage.className = 'croc-game';
    stage.innerHTML = `
      <div class="croc-water" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="croc-field">
        <div class="croc-toy">
          <div class="croc-shadow"></div>
          <canvas class="croc-body" aria-hidden="true"></canvas>
          <div class="croc-lower">
            <canvas aria-hidden="true"></canvas>
            <div class="croc-teeth" role="group" aria-label="악어 이빨"></div>
          </div>
          <canvas class="croc-head" aria-hidden="true"></canvas>
          <div class="croc-burst" aria-hidden="true"><strong>당첨!</strong></div>
        </div>
      </div>
      <div class="croc-tray">
        <span class="croc-count"><i aria-hidden="true"></i>남은 이빨 <b></b></span>
        <button type="button" class="croc-replay" hidden><span aria-hidden="true">↻</span> 다시 하기</button>
      </div>
      <span class="croc-reader" aria-live="polite" aria-atomic="true"></span>`;
    root.replaceChildren(stage);
    paint(stage.querySelector('.croc-body'), body);
    paint(stage.querySelector('.croc-lower canvas'), lowerJaw);
    paint(stage.querySelector('.croc-head'), upperJaw);

    const teethGroup = stage.querySelector('.croc-teeth');
    const count = stage.querySelector('.croc-count');
    const countValue = count.querySelector('b');
    const replay = stage.querySelector('.croc-replay');
    const reader = stage.querySelector('.croc-reader');
    let winningTooth;
    let remaining;
    let finished;

    const buttons = teeth.map(([x, y, angle], index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'croc-tooth';
      if (index >= 9) button.classList.add('croc-fang');
      button.setAttribute('aria-label', (index + 1) + '번 이빨');
      button.style.left = (x / 600 * 100) + '%';
      button.style.top = (y / 520 * 100) + '%';
      button.style.setProperty('--croc-angle', angle + 'deg');
      button.innerHTML = '<span aria-hidden="true"></span>';
      teethGroup.append(button);
      button.addEventListener('click', event => {
        if (finished || button.disabled) return;
        button.classList.add('is-pressed');
        button.disabled = true;
        remaining--;
        if (index === winningTooth) {
          finished = true;
          buttons.forEach(tooth => { tooth.disabled = true; });
          stage.classList.add('is-bitten');
          count.hidden = true;
          replay.hidden = false;
          reader.textContent = '당첨! 악어가 입을 닫았어요.';
          if (!event.detail) replay.focus({preventScroll: true});
        } else {
          countValue.textContent = remaining + '개';
          reader.textContent = (index + 1) + '번 이빨 통과. 남은 이빨 ' + remaining + '개.';
          if (!event.detail) (buttons.slice(index + 1).find(tooth => !tooth.disabled) || buttons.find(tooth => !tooth.disabled)).focus({preventScroll: true});
        }
      });
      return button;
    });

    function reset() {
      winningTooth = Math.floor(Math.random() * buttons.length);
      remaining = buttons.length;
      finished = false;
      stage.classList.remove('is-bitten');
      for (const button of buttons) {
        button.disabled = false;
        button.classList.remove('is-pressed');
      }
      count.hidden = false;
      countValue.textContent = remaining + '개';
      replay.hidden = true;
      reader.textContent = '';
    }
    replay.addEventListener('click', event => {
      reset();
      if (!event.detail) buttons[0].focus({preventScroll: true});
    });
    reset();
    return () => stage.remove();
  };
})();
