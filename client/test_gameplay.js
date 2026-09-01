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

socket1.on('connect', () => {
  console.log('Socket 1 connected:', socket1.id);
  
  // 1. Test Clock Sync
  const sendTime = Date.now();
  socket1.emit('sync_time', sendTime);

  socket1.on('sync_time_reply', ({ clientSendTime, serverTime }) => {
    assert(clientSendTime === sendTime, 'Clock sync preserves client timestamp');
    assert(typeof serverTime === 'number' && serverTime > 0, 'Server provides authoritative serverTime');

    // 2. Test Player Join
    socket1.emit('join_game', { name: 'AlphaPlayer', avatar: 1 });
  });

  socket1.on('join_confirmed', ({ player, isHost }) => {
    assert(player.name === 'AlphaPlayer', 'Player name registered properly');
    assert(isHost === true, 'First player assigned as Host');

    // Join second player
    socket2.emit('join_game', { name: 'BetaPlayer', avatar: 2 });
  });
});

socket2.on('join_confirmed', ({ player, isHost }) => {
  assert(player.name === 'BetaPlayer', 'Second player registered properly');
  assert(isHost === false, 'Second player is not host');

  // 3. Test Host adding crowd bots
  socket1.emit('add_bots', 6);
});

let botsVerified = false;
let tournamentStarted = false;

socket1.on('game_state', (state) => {
  // Verify bot addition
  if (!botsVerified && state.players.length >= 8) {
    botsVerified = true;
    assert(state.players.length >= 8, `Crowd bots simulated successfully (Count: ${state.players.length})`);

    // 4. Test Start Tournament
    socket1.emit('start_tournament');
    tournamentStarted = true;
  }

  if (state.status === 'ROUND_ACTIVE') {
    assert(state.players.some(p => p.team === 'red') && state.players.some(p => p.team === 'blue'), 'Players randomly assigned to Red & Blue teams');

    // 5. Test Anti-Bot Click Throttling (< 100ms)
    console.log('Testing anti-bot protection with high frequency clicks...');
    
    // First pull
    socket1.emit('pull', Date.now(), (res1) => {
      console.log('Pull 1 result:', res1);
      assert(res1.success === true, 'First valid pull succeeds');

      // Immediate 2nd pull within 15ms (< 100ms threshold)
      socket1.emit('pull', Date.now(), (res2) => {
        console.log('Pull 2 result (rapid):', res2);
        assert(res2.success === false, 'Rapid pull (<100ms) rejected by server');
        assert(res2.reason === 'anti_bot_throttled', 'Reason flagged as anti_bot_throttled');

        // Valid pull after 150ms
        setTimeout(() => {
          socket1.emit('pull', Date.now(), (res3) => {
            console.log('Pull 3 result (after 150ms):', res3);
            assert(res3.success === true, 'Rhythmic pull (>100ms) succeeds');

            console.log('\n===========================================');
            console.log(`🎉 ALL ${testsPassed} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
            console.log('===========================================\n');

            // Reset tournament back to clean lobby
            socket1.emit('reset_tournament');
            socket1.emit('clear_bots');

            setTimeout(() => {
              socket1.disconnect();
              socket2.disconnect();
              process.exit(0);
            }, 500);
          });
        }, 150);
      });
    });
  }
});
