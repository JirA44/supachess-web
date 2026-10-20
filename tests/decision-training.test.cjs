'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {classifyMove,pickLearningPriorities,buildExplanation} = require('../js/decision-training.cjs');

test('centipawn loss is oriented to the moving side', () => {
  assert.equal(classifyMove({beforeCp:100,afterCp:-200,mover:'w'}).category,'blunder');
  assert.equal(classifyMove({beforeCp:-100,afterCp:200,mover:'b'}).category,'blunder');
  assert.equal(classifyMove({beforeCp:50,afterCp:40,mover:'w'}).category,'acceptable');
});
test('mate score must not be mistaken for a normal blunder score',()=> {
  assert.equal(classifyMove({beforeCp:0,afterCp:0,mover:'w',mateAfter:-2}).category,'review_mate');
});
test('small sample and missing data are not labelled proven weakness',()=> {
  const p=pickLearningPriorities([{skill:'missed_threat',score:0}],6);
  assert.equal(p.find(x=>x.id==='missed_threat').confidence,'low');
  assert.equal(p.find(x=>x.id==='endgame').mastery,null);
});
test('explanations preserve candidate alternatives and caveats',()=>{
  const e=buildExplanation({played:'Nf3',candidateMoves:[{san:'d4',cp:30}],opponentReply:'d5',theme:'calculation_depth'});
  assert.equal(e.alternatives[0].san,'d4');
  assert.match(e.caveat,/UCI/);
});
