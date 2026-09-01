import { io } from 'socket.io-client';

console.log('🧪 RUNNING AUTOMATED SOCKET & GAMEPLAY VERIFICATION...');

const socket1 = io('http://localhost:3001');
const socket2 = io('http://localhost:3001');

let testsPassed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
    testsPassed++;
  }
}

let stage = 'INIT';

socket1.on('connect', () => {
  console.log('Socket 1 connected:', socket1.id);
  
  // Claim host and reset to clean lobby
  socket1.emit('claim_host');
  socket1.emit('reset_tournament');
  socket1.emit('clear_bots');

  // Test clock sync
  const sendTime = Date.now();
  socket1.emit('sync_time', sendTime);

  socket1.on('sync_time_reply', ({ clientSendTime, serverTime }) => {
    assert(clientSendTime === sendTime, 'Clock sync preserves client timestamp');
    assert(typeof serverTime === 'number' && serverTime > 0, 'Server provides authoritative serverTime');
  });
});

socket1.on('game_state', async (state) => {
  if (stage === 'INIT' && state.status === 'LOBBY') {
    stage = 'JOINING';
    socket1.emit('join_game', { name: 'AlphaPlayer', avatar: 1 });
  }

  if (stage === 'JOINED_ALPHA') {
    stage = 'JOINING_BETA';
    socket2.emit('join_game', { name: 'BetaPlayer', avatar: 2 });
  }

  if (stage === 'READY_FOR_BOTS') {
    stage = 'ADDING_BOTS';
    socket1.emit('add_bots', 6);
  }

  if (stage === 'ADDING_BOTS' && state.players.length >= 8) {
    stage = 'STARTING_TOURNAMENT';
    assert(state.players.length >= 8, `Crowd bots simulated successfully (Count: ${state.players.length})`);
    socket1.emit('start_tournament');
  }

  if (stage === 'STARTING_TOURNAMENT' && state.status === 'ROUND_ACTIVE') {
    stage = 'TESTING_PULLS';
    assert(state.players.some(p => p.team === 'red') && state.players.some(p => p.team === 'blue'), 'Players randomly assigned to Red & Blue teams');

    console.log('Testing unlimited fast clicks...');
    const pull1 = await new Promise((res) => socket1.emit('pull', Date.now(), res));
    console.log('Pull 1 result:', pull1);
    assert(pull1.success === true, 'First valid pull succeeds');
    console.log('✅ PASSED: First pull succeeds');

    // Rapid second pull (e.g. 55ms, testing fast physical tapping without double-dipping)
    await new Promise((r) => setTimeout(r, 55));
    const pull2 = await new Promise((res) => socket1.emit('pull', Date.now(), res));
    console.log('Pull 2 result (rapid tapping):', pull2);
    assert(pull2.success === true, 'Rapid pull succeeds with fast click speed');
    console.log('✅ PASSED: Rapid pull succeeds (Fast click speed enabled!)');

    console.log('\n===========================================');
    console.log(`🎉 ALL ${testsPassed} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================\n');

    socket1.emit('reset_tournament');
    socket1.emit('clear_bots');

    setTimeout(() => {
      socket1.disconnect();
      socket2.disconnect();
      process.exit(0);
    }, 400);
  }
});

socket1.on('join_confirmed', ({ player }) => {
  assert(player.name === 'AlphaPlayer', 'Player name registered properly');
  stage = 'JOINED_ALPHA';
});

socket2.on('join_confirmed', ({ player }) => {
  assert(player.name === 'BetaPlayer', 'Second player registered properly');
  stage = 'READY_FOR_BOTS';
});
