// boss-gx-700-patch-parser/src/script.js

// See https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API

// Secure context: This feature is available only in secure contexts (HTTPS), in some or all supporting browsers.

// The Web MIDI API connects to and interacts with Musical Instrument Digital Interface (MIDI) Devices.
//
// The interfaces deal with the practical aspects of sending and receiving MIDI messages. Therefore, the API can be used for musical and non-musical uses, with any MIDI device connected to your computer.

// Note: In Firefox the Web MIDI API is an add-on-gated feature. This means your website or app needs a site permission add-on for users to download, install and be able to access this API's functionality. Instructions on how to set up a site permission add-on can be found here:
//
// https://extensionworkshop.com/documentation/publish/site-permission-add-on/

// let debugMessages = [];

// Listing inputs and outputs

// In this example the list of input and output ports are retrieved and printed to the console.

function listInputsAndOutputs(midiAccess) {
	console.log(`MIDI: ${midiAccess.inputs.size} input port(s) and ${midiAccess.outputs.size} output port(s) detected.`);

	for (const entry of midiAccess.inputs) {
		const input = entry[1];

		console.log(`Input port [type:'${input.type}']` +
			` id:'${input.id}'` +
			` manufacturer:'${input.manufacturer}'` +
			` name:'${input.name}'` +
			` version:'${input.version}'`);

		// We could handle MIDI messages on a per-port basis; e.g.:
		// input.onmidimessage = (msg) => {
		// 	// typeof msg.data is Uint8Array
		// 	console.log(msg);
		// }
	}

	for (const entry of midiAccess.outputs) {
		const output = entry[1];

		console.log(`Output port [type:'${output.type}']` +
			` id:'${output.id}'` +
			` manufacturer:'${output.manufacturer}'` +
			` name:'${output.name}'` +
			` version:'${output.version}'`);
	}
}

function signed(n) {
	let str = '';

	if (n > 0) {
		str = '+';
	}

	return `${str}${n}`;
}

function createMidiControlNumbersArray() {
	// MIDI C#1-31, 64-95
	let i;
	let result = [];

	for (i = 1; i <= 31; ++i) {
		result.push(`MIDI C#${i}`);
	}

	for (i = 64; i <= 95; ++i) {
		result.push(`MIDI C#${i}`);
	}

	return result;
}

function printMIDIMessageAsHex(eventData) {
	// let str = `MIDI message received at timestamp ${event.timeStamp}[${event.data.length} bytes]: `;
	let str = '';
	let i;

	console.log(`\nMIDI message contains ${eventData.length} bytes:`);

	for (i = 0; i < eventData.length; ++i) {
		let hex = eventData[i].toString(16);

		if (hex.length < 2) {
			hex = '0' + hex;
		}

		if (i % 16 === 0) {
			str += '\n';
		}

		str += `0x${hex} `;
	}

	console.log(str + '\n');
}

// Handling MIDI Input

function onMIDIMessage(event) {
	// Look for the header:
	// Does the message begin with 0xf0 0x41 0x0 0x79 0x12 0x0 ?

	if (event.data.length < 15 ||
		event.data[0] != 0xf0 ||
		event.data[1] != 0x41 ||
		event.data[2] != 0 ||
		event.data[3] != 0x79 ||
		event.data[4] != 0x12 ||
		event.data[5] != 0
	) {
		// console.error('**** Expected Boss GX-700 message header not found ****');
		return;
	}

	const patchNum = event.data[6] + 1;
	const messageNum = event.data[7];
	const expectedMessageLengths = [77, 19, 24, 17, 21, 15, 18, 16, 16, 88, 32, 20, 16, 20];
	const patchSectionNames = [
		'Header',
		'Compression',
		'Wah',
		'Overdrive / Distortion',
		'Preamp',
		'Loop',
		'Equalization',
		'Speaker Simulation',
		'Noise Suppression',
		'Modulation',
		'Delay',
		'Chorus',
		'Tremolo / Panning',
		'Reverb'
	];

	// console.log('GX-700 SysEx message');
	// console.log('  Patch number', patchNum);
	// console.log('  Patch message', messageNum);

	if (messageNum >= expectedMessageLengths.length) {
		console.error('**** Bad message number ****');
		return;
	} else if (event.data.length != expectedMessageLengths[messageNum]) {
		console.error('**** Bad message length ****');
		return;
	} else if (event.data[event.data.length - 1] != 0xf7) {
		console.error('**** Last byte in message is not 0xf7 ****');
		return;
	} else if (messageNum == 0) {
		// Handle the patch's header message.

		// The patch name is 12 characters long.
		console.log('\n  Patch name:', new TextDecoder().decode(event.data.slice(23, 35)));

		// Bytes 35-74 should be:
		// 03 07 00 00 00 64 00 00 00 7F 03 07 00 00 00 64
		// 0B 00 00 7F 00 00 00 00 00 64 01 00 00 7F 00 00
		// 00 00 00 64 24 00 00 7F

		// ... followed by a checksum byte (?), followed by the terminating 0xf7

		return;
	} else if (event.data[8] != 0) {
		console.error('**** event.data[8] != 0 ****');
		return;
	} else if (event.data[9] != 0 && event.data[9] != 1) {
		console.error('**** event.data[9] (patch section enabled/disabled) is neither zero nor one ****');
		return;
	}

	const patchSectionEnabled = event.data[9] != 0;

	// console.log('  Patch number', patchNum, '-', patchSectionNames[messageNum], '-', patchSectionEnabled ? 'Enabled' : 'Disabled');

	if (!patchSectionEnabled) {
		console.log(`  (${patchSectionNames[messageNum]} is disabled)`);
		return;
	}

	console.log('  Patch number', patchNum, '-', patchSectionNames[messageNum]);

	const compressorTypes = ['Compressor', 'Limiter'];

	const midiControlNumbersArray = createMidiControlNumbersArray();

	const pedals = ['Expression Pedal', 'FC-200EXP'].concat(midiControlNumbersArray);

	const pedalsForWah = ['Fixed'].concat(pedals);

	const controlPedals = ['Fixed', 'Control 1', 'Control 2', 'FC-200CTL'].concat(midiControlNumbersArray);

	const polarities = ['Down', 'Up'];

	const distortionTypes = ['Vintage OD', 'Turbo OD', 'Blues', 'Distortion', 'Turbo DS', 'Metal', 'Fuzz'];

	const preamps = ['JC-120', 'Clean Twin', 'Match Drive', 'BG Lead', 'MS 1959 (I)', 'MS 1959 (II)', 'MS 1959 (I + II)', 'SLDN LEAD', 'METAL 5150'];

	const eqMidFreqs = ['100 Hz', '125 Hz', '160 Hz', '200 Hz', '250 Hz', '315 Hz', '400 Hz', '500 Hz', '630 Hz', '800 Hz', '1.00 kHz', '1.25 kHz', '1.60 kHz', '2.00 kHz', '2.50 kHz', '3.15 kHz', '4.00 kHz', '5.00 kHz', '6.30 kHz', '8.00 kHz', '10.0 kHz'];

	const eqMidQ = ['0.5', '1', '2', '4', '8', '16'];

	const speakerTypes = ['Small', 'Middle', 'JC-120', 'Built-In 1', 'Built-In 2', 'Built-In 3', 'Built-In 4', 'BG Stack 1', 'BG Stack 2', 'MS Stack 1', 'MS Stack 2', 'Metal Stack'];

	const modulationTypes = ['Flanger', 'Phaser', 'Pitch Shifter', 'Harmonist', 'Vibrato', 'Ring Modulator', 'Humanizer'];

	const phaserTypes = ['4-stage', '6-stage', '8-stage', '10-stage', '12-stage'];

	const keys = [
		'C maj', 'Db maj', 'D maj', 'Eb maj', 'E maj', 'F maj',
		'F# (Gb) maj', 'G maj', 'Ab maj', 'A maj', 'Bb maj', 'B maj',
		'A min', 'Bb min', 'B min', 'C min', 'C# min', 'D min',
		'D# (Eb) min', 'E min', 'F min', 'F# min', 'G min', 'G# min'
	];

	// - Interval [1-3] : From 2 octaves down to 2 octaves up: 29 options: ['-2 octaves', ..., 'Unity', '+ 2nd', '+ 3rd', ..., '+ Octave', '+ 2nd above Octave (9th?)', ... '+ 7th above Octave', '+2 octaves']
	// TODO:
	const intervals = [
		'-2Oct', '-Oct-7th', '-Oct-6th', '-Oct-5th', '-Oct-4th', '-Oct-3rd', '-Oct-2nd',
		'-Oct', '-7th', '-6th', '-5th', '-4th', '-3rd', '-2nd',
		'UNI',
		'+2nd', '+3rd', '+4th', '+5th', '+6th', '+7th', '+Oct',
		'+Oct+2nd', '+Oct+3rd', '+Oct+4th', '+Oct+5th', '+Oct+6th', '+Oct+7th', '+2Oct'
	];

	const pitchShifterTypes = ['Slow', 'Fast', 'Mono'];

	const vowels = ['a', 'e', 'i', 'o', 'u'];

	const delayModes = ['Normal', 'Tempo'];

	const delayIntervalCValues = ['1/4', '1/3', '3/8', '1/2', '2/3', '3/4', '1.0', '1.5', '2.0', '3.0', '4.0'];

	const lowCutOptions = ['Flat', '55 Hz', '110 Hz', '165 Hz', '220 Hz', '280 Hz', '340 Hz', '400 Hz', '500 Hz', '630 Hz', '800 Hz'];

	const hiCutOptions = [
		'500 Hz', '630 Hz', '800 Hz', '1.00 kHz',
		'1.25 kHz', '1.60 kHz', '2.00 kHz', '2.50 kHz',
		'3.15 kHz', '4.00 kHz', '5.00 kHz', '6.30 kHz',
		'8.00 kHz', '10.0 kHz', '12.5 kHz', 'Flat'
	];

	const tremPanTypes = [
		'Tremolo - Triangular Wave', 'Tremolo - Square Wave',
		'Pan - Triangular Wave', 'Pan - Square Wave'
	];

	const reverbTypes = ['Room1', 'Room2', 'Hall1', 'Hall2', 'Plate'];

	switch (messageNum) {
		case 1:		// Compression - 19 bytes
			console.log('    Compressor type:', compressorTypes[event.data[10]]);

			if (event.data[10] == 0) {
				console.log('    Sustain:', event.data[11]); // [0 ... 100]
				console.log('    Attack:', event.data[12]); // [0 ... 100]
			} else if (event.data[10] == 1) {
				console.log('    Threshold:', event.data[13]); // [0 ... 100]
				console.log('    Release:', event.data[14]); // [0 ... 100]
			}

			console.log('    Tone:', signed(event.data[15] - 50)); // [-50 ... +50]
			console.log('    Effect level:', event.data[16]); // [0 ... 100]
			break;

		case 2:		// Wah - 24 bytes
			// - Mode: 'Pedal Wah', 'Sw-Pedal Wah', 'Auto Wah'

			// if (mode is 'Pedal Wah' or 'Sw-Pedal Wah') {
			if (event.data[10] == 0 || event.data[10] == 1) {
				console.log('    Frequency:', event.data[11]); // [0 ... 100]
				console.log('    Peak:', event.data[15]); // [0 ... 100]
				console.log('    Pedal:', (event.data[16] < pedalsForWah.length) ? pedalsForWah[event.data[16]] : 'MIDI'); // FIXED, EXP PEDAL, FC-200EXP, MIDI C#1-31, 64-95
				console.log('    Pedal Minimum:', event.data[17]); // [0 ... 100]
				console.log('    Pedal Maximum:', event.data[18]); // [0 ... 100]
			// } else if (mode is 'Auto Wah') {
			} else if (event.data[10] == 2) {
				console.log('    Polarity:', polarities[event.data[12]]); // ['Down', 'Up']
				console.log('    Sensitivity:', event.data[13]); // [0 ... 100]
				console.log('    Manual:', event.data[14]); // [0 ... 100]
				console.log('    Peak:', event.data[15]); // [0 ... 100]
				console.log('    Rate:', event.data[19]); // [0 ... 100]
				console.log('    Depth:', event.data[20]); // [0 ... 100]
			}

			console.log('    Effect level:', event.data[21]); // [0 ... 100]
			break;

		case 3:		// Overdrive / Distortion - 17 bytes
			console.log('    Distortion type:', distortionTypes[event.data[10]]);
			console.log('    Drive:', event.data[11]); // [0 ... 100]
			console.log('    Bass:', signed(event.data[12] - 50)); // [-50 ... +50]
			console.log('    Treble:', signed(event.data[13] - 50)); // [-50 ... +50]
			console.log('    Effect level:', event.data[14]); // [0 ... 100]
			break;

		case 4:		// Preamp - 21 bytes
			// Type : ['JC-120', 'Clean Twin', 'Match Drive', 'BG Lead', 'MS 1959 (I)', 'MS 1959 (II)', 'MS 1959 (I + II)', 'SLDN LEAD', 'METAL 5150']

			console.log('    Preamp type:', preamps[event.data[10]]);
			console.log('    Volume:', event.data[11]); // [0 ... 100]
			console.log('    Bass:', event.data[12]); // [0 ... 100]
			console.log('    Middle:', event.data[13]); // [0 ... 100]
			console.log('    Treble:', event.data[14]); // [0 ... 100]
			console.log('    Presence:', event.data[15]); // [0 ... 100]
			console.log('    Master:', event.data[16]); // [0 ... 100]

			// Note: 'Match Drive', 'MS 1959 (I)', 'MS 1959 (II)', 'MS 1959 (I + II)', 'SLDN LEAD', and 'METAL 5150' do not have a 'Bright' setting.

			if ([0, 1, 3].indexOf(event.data[10]) >= 0) {
				console.log('    Bright:', ['Off', 'On'][event.data[17]]);
			}

			console.log('    Gain:', ['Low', 'Middle', 'High'][event.data[18]]);
			break;

		case 5:		// Loop - 15 bytes
			console.log('    Return Level:', event.data[10], '%'); // [0% ... 100%]
			console.log('    Send Level:', event.data[11], '%'); // [0% ... 100%]
			console.log('    Mode:', ['Series', 'Parallel'][event.data[12]]);
			break;

		case 6:		// Equalization - 18 bytes
			console.log('    Low Gain:', signed(event.data[10] - 20), 'dB');
			console.log('    Middle Frequency:', eqMidFreqs[event.data[11]]);
			console.log('    Middle Gain:', signed(event.data[12] - 20), 'dB');
			console.log('    Middle Q:', eqMidQ[event.data[13]]);
			console.log('    High Gain:', signed(event.data[14] - 20), 'dB');
			console.log('    Level:', signed(event.data[15] - 20), 'dB');
			break;

		case 7:		// Speaker Simulation - 16 bytes
			// - Type: ['Small', 'Middle', 'JC-120', 'Built-In 1-4', 'BG Stack 1-2', 'MS Stack 1-2', 'Metal Stack'];
			console.log('    Speaker type:', speakerTypes[event.data[10]]);
			console.log('    Mic setting:', event.data[11]); // [1 ... 10]
			console.log('    Mic level:', event.data[12]); // [0 ... 100]
			console.log('    Direct level:', event.data[13]); // [0 ... 100]
			break;

		case 8:		// Noise Suppression - 16 bytes
			console.log('    Threshold:', event.data[10]); // [0 ... 100]
			console.log('    Release:', event.data[11]); // [0 ... 100]
			console.log('    Detect:', ['Guitar in', 'NS in'][event.data[12]]);
			console.log('    Effect level:', event.data[13]); // [0 ... 100]
			break;

		case 9:		// Modulation - 88 bytes
			console.log('    Modulation mode:', modulationTypes[event.data[10]]);

			if (event.data[10] == 0) {
				// Flanger

				console.log('    Rate:', event.data[17]); // [0 ... 100]
				console.log('    Depth:', event.data[18]); // [0 ... 100]
				console.log('    Manual:', event.data[19]); // [0 ... 100]
				console.log('    Resonance:', signed(event.data[20] * 16 + event.data[21] - 100)); // [-100 ... +100]
				console.log('    Separation:', signed(event.data[23] * 16 + event.data[24] - 100)); // [-100 ... +100]
				console.log('    Gate:', (event.data[25] == 0) ? 'Off' : event.data[25]); // - Gate: Off, [1 ... 100]
			} else if (event.data[10] == 1) {
				// Phaser

				console.log('    Phaser type:', phaserTypes[event.data[11]]);
				console.log('    Rate:', event.data[17]); // [0 ... 100]
				console.log('    Depth:', event.data[18]); // [0 ... 100]
				console.log('    Manual:', event.data[19]); // [0 ... 100]
				console.log('    Resonance:', signed(event.data[20] * 16 + event.data[21] - 100)); // [-100 ... +100]
				console.log('    Step:', (event.data[22] == 0) ? 'Off' : event.data[22]); // Off, [1 ... 100]
			} else if (event.data[10] == 2) {
				// Pitch shifter

				console.log('    Pitch shifter type:', pitchShifterTypes[event.data[31]]);

				// Voice 1
				console.log('    Pitch[1]:', signed(event.data[32] - 24));
				console.log('    Fine[1]:', signed(event.data[35] - 50));
				console.log(`    Pan[1]: L${100 - event.data[42]}:${event.data[42]}R`);
				console.log('    Level[1]:', event.data[45]);

				// Voice 2
				console.log('    Pitch[2]:', signed(event.data[33] - 24));
				console.log('    Fine[2]:', signed(event.data[36] - 50));
				console.log(`    Pan[2]: L${100 - event.data[43]}:${event.data[43]}R`);
				console.log('    Level[2]:', event.data[46]);

				// Voice 3
				console.log('    Pitch[3]:', signed(event.data[34] - 24));
				console.log('    Fine[3]:', signed(event.data[37] - 50));
				console.log(`    Pan[3]: L${100 - event.data[44]}:${event.data[44]}R`);
				console.log('    Level[3]:', event.data[47]);

				console.log(`    Balance: D${100 - event.data[48]}:${event.data[48]}E`);
				console.log('    Total level:', event.data[49]);
			} else if (event.data[10] == 3) {
				// Harmonist

				// - Pan [1-3] : R = [0 ... 100], L = 100 - R
				// - Level [1-3] : [0 ... 100]
				// - Balance : E = [0 ... 100], D = 100 - E
				// - Total level : [0 ... 100]

				// Patch 19 BG 3VOICE
				// - Key: C maj -> 0x00
				// - Interval [1-3] : +3rd, -4th, UNI
				//   - +3rd = decimal 16
				// - Pan [1-3] : L30:70R, L70:30R, L50:50R
				// - Level [1-3] : 80, 80, 0
				// - Balance : D50:50E
				// - Total level : 80

				// F0 41 00 79 12 00 12 09 00 01 03 02 02 50 00 00
				// 02 14 29 32 07 08 00 06 05 00 01 00 53 64 00 01
				// 24 0C 18 32 32 32 00 10 0B 0E 46 1E 32 50 50 00
				// 32 50 1C 13 18 1B 12 18 1B 13 18 1B 12 18 1B 13
				// 18 1C 13 18 1B 12 18 1C 13 18 1B 12 18 1B 13 18
				// 1B 12 18 1B 12 18 45 F7

				// Patch 32 1NOTE CHORD
				// - Key: C maj -> 0x00 -> Byte 38
				// - Interval [1-3] : -3rd, -5th, +Oct -> Bytes 39-41
				// - Pan [1-3] : L60:40R, L40:60R, L50:50R
				//   -> Bytes 42-44: 28 3C 32 = 40 60 50 = the R
				// - Level [1-3] : 80, 80, 5 -> Bytes 45-47
				// - Balance : D50:50E -> Byte 48
				// - Total level : 85 -> Byte 49

				// F0 41 00 79 12 00 1F 09 00 01 03 02 02 50 00 00
				// 02 14 29 32 07 08 00 06 05 00 01 00 53 64 00 01
				// 24 0C 30 32 32 32 00 0C 0A 15 28 3C 32 50 50 05
				// 32 55 13 11 24 14 11 24 15 11 24 14 11 24 14 11
				// 24 15 12 24 14 11 24 15 11 24 14 11 24 14 11 24
				// 14 11 24 14 11 24 6A F7

				printMIDIMessageAsHex(event.data);

				console.log('    Key:', keys[event.data[38]]);

				// Voice 1
				console.log('    Interval[1]:', intervals[event.data[39]]);
				console.log(`    Pan[1]: L${100 - event.data[42]}:${event.data[42]}R`);
				console.log('    Level[1]:', event.data[45]);

				// Voice 2
				console.log('    Interval[2]:', intervals[event.data[40]]);
				console.log(`    Pan[2]: L${100 - event.data[43]}:${event.data[43]}R`);
				console.log('    Level[2]:', event.data[46]);

				// Voice 3
				console.log('    Interval[3]:', intervals[event.data[41]]);
				console.log(`    Pan[3]: L${100 - event.data[44]}:${event.data[44]}R`);
				console.log('    Level[3]:', event.data[47]);

				console.log(`    Balance: D${100 - event.data[48]}:${event.data[48]}E`);
				console.log('    Total level:', event.data[49]);
				// TODO: Output Meter: In: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
				// TODO: Output Meter: Out[1-3]: [-2Oct, ..., +2Oct] -> Same scale as In, but with the relevant interval added.
				// E.g. C +3rd -> E
				// But note that C +3rd -> E and C# +3rd -> E
				// (The domain of the mapping has size 12; the range has size 9 (?))
			} else if (event.data[10] == 4) {
				// Vibrato

				// Note (by ThAW): Vibrato is an effect that creates a cyclic change in pitch (?)

				// Patch 35 AUTO VIBRATO :
				// - Trigger: Auto -> 0x02
				// - Rise time: 70
				// - Rate: 60
				// - Depth: 41

				console.log('    Trigger:', ['Off', 'On', 'Auto'][event.data[12]]);
				console.log('    Rise time:', event.data[13]); // [0 ... 100]
				console.log('    Rate:', event.data[17]); // [0 ... 100]
				console.log('    Depth:', event.data[18]); // [0 ... 100]
			} else if (event.data[10] == 5) {
				// Ring modulator

				console.log('    Frequency:', (event.data[28] == 0) ? 'Intelligent' : event.data[28]); // [Intelligent, 1 ... 100]
				console.log('    Effect Level:', event.data[29]); // [0 ... 100]
				console.log('    Direct Level:', event.data[30]); // [0 ... 100]
			} else if (event.data[10] == 6) {
				// Humanizer

				// E.g. 37 IYA CRUNCH :

				// Modulation: F0 41 00 79 12 00 24 09 00 01 06 02 02 50 00 02 00 42 45 32 07 08 00 06 05 00 01 00 53 64 00 01 24 0C 30 32 32 32 00 10 0B 15 32 00 64 50 1E 14 32 55 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 13 24 1C 13 24 1B 12 24 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 12 24 50 F7

				// Payload: 06 02 02 50 00 02 00 42 45 32 07 08 00 06 05 00 01 00 53 64 00 01 24 0C 30 32 32 32 00 10 0B 15 32 00 64 50 1E 14 32 55 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 13 24 1C 13 24 1B 12 24 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 12 24

				// - Type: Auto -> the 0x00 in byte 14
				// - Vowel: i-a -> the 0x02 and 0x00 in bytes 15 and 16
				// - Rate: 66 = 0x42 -> Byte 17
				// - Depth: 69 = 0x45 -> Byte 18
				// - Trigger: Auto -> the 0x01 in byte 26

				// E.g. 98 EXP HUMANIZE :

				// Modulation: F0 41 00 79 12 00 61 09 00 01 06 02 02 50 01 00 02 14 3C 32 07 08 00 06 05 00 01 01 53 64 00 01 24 0C 30 32 32 32 00 10 0B 15 32 00 64 50 1E 14 32 55 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 13 24 1C 13 24 1B 12 24 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 12 24 48 F7

				// Payload: 06 02 02 50 01 00 02 14 3C 32 07 08 00 06 05 00 01 01 53 64 00 01 24 0C 30 32 32 32 00 10 0B 15 32 00 64 50 1E 14 32 55 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 13 24 1C 13 24 1B 12 24 1C 13 24 1B 12 24 1B 13 24 1B 12 24 1B 12 24

				// - Type: Pedal = 1?
				// - Vowel: a-i = 0, 2
				// - Rate: X
				// - Depth: X
				// - Trigger: X
				// - Pedal: FC-200EXP = 1 -> Byte 27

				console.log('    Humanizer type:', ['Auto', 'Pedal'][event.data[14]]);
				console.log('    Vowel 1:', vowels[event.data[15]]); // ['a', 'e', 'i', 'o', 'u']
				console.log('    Vowel 2:', vowels[event.data[16]]); // ['a', 'e', 'i', 'o', 'u']

				if (event.data[14] == 0) {
					console.log('    Rate:', event.data[17]); // [0 ... 100]
					console.log('    Depth:', event.data[18]); // [0 ... 100]
					console.log('    Trigger:', ['Off', 'Auto'][event.data[26]]);
				} else if (event.data[14] == 1) {
					console.log('    Pedal:', pedals[event.data[27]]); // EXP PEDAL, FC-200EXP, MIDI C#1-31, 64-95
				}
			}

			break;

		case 10:	// Delay - 32 bytes
			// TODO - Test the four 256s

			printMIDIMessageAsHex(event.data);

			console.log('    Delay mode:', delayModes[event.data[10]]);
			// Tempo In? : Fixed, Control 1-2, FC-200CTL, MIDI C#1-31, 64-95
			// Tempo (used when Tempo In = Fixed) : Quarter note = [50 ... 300] per minute?

			if (event.data[10] == 0) {
				// Delay mode: Normal

				console.log(`    Delay Time[C]: ${event.data[14] * 128 + event.data[15]} ms`); // [1 ms ... 2000 ms]
				// To test: Should these four 256s be 128s?
				console.log(`    Delay Time[L]: ${event.data[16] * 256 + event.data[17]} %`); // [1% ... 400%]
				console.log(`    Delay Time[R]: ${event.data[18] * 256 + event.data[19]} %`); // [1% ... 400%]
			} else if (event.data[10] == 1) {
				// Delay mode: Tempo

				console.log('    Tempo In foot switch:', controlPedals[event.data[11]]);

				if (event.data[11] == 0) { // Tempo In foot switch == 'Fixed'
					// Patch 12 LANDAU JUICE: Tempo = 94
					console.log('    Tempo:', event.data[12] * 16 + event.data[13] + 50);
				}

				console.log('    Delay Interval[C]:', delayIntervalCValues[event.data[20]]);
				console.log(`    Delay Interval[L]: ${event.data[16] * 256 + event.data[17]} %`); // [1% ... 400%]
				console.log(`    Delay Interval[R]: ${event.data[18] * 256 + event.data[19]} %`); // [1% ... 400%]
			}

			console.log('    Feedback:', event.data[21]); // [0 ... 100]
			console.log('    Level[C]:', event.data[22]); // [0 ... 100]
			console.log('    Level[L]:', event.data[23]); // [0 ... 100]
			console.log('    Level[R]:', event.data[24]); // [0 ... 100]
			console.log('    Hi Damp:', signed(event.data[25] - 50)); // [-50 ... 0]
			console.log('    Hi cut:', hiCutOptions[event.data[26]]);
			console.log('    Smooth:', ['Off', 'On'][event.data[27]]);
			console.log('    Effect level:', event.data[28]); // [0 ... 100]
			console.log('    Direct level:', event.data[29]); // [0 ... 100]
			break;

		case 11:	// Chorus - 20 bytes
			console.log('    Chorus mode:', ['Mono', 'Stereo'][event.data[10]]);
			console.log('    Rate:', event.data[11]); // [0 ... 100]
			console.log('    Depth:', event.data[12]); // [0 ... 100]
			console.log('    Predelay:', event.data[13] * 0.5, 'ms');
			// Low cut options: Flat, 55 Hz, 110 Hz, 165, 220 280 340 400 500 630 800
			console.log('    Low cut:', lowCutOptions[event.data[14]]);
			// Hi cut options: 500 630 800 1.00k 1.25k 1.60k 2.00k 2.50k 3.15k 4.00k 5.00k 6.30k 8.00k 10.0k 12.5k, Flat
			console.log('    Hi cut:', hiCutOptions[event.data[15]]);
			console.log(`    LFO: tri${10 - event.data[16]}:sin${event.data[16]}`);
			console.log('    Effect level:', event.data[17]); // [0 ... 100]
			break;

		case 12:	// Tremolo / Panning - 16 bytes
			// E.g. 38 ROTARY; 40 STEP PHASER
			// Note: Tremolo is an effect that creates a cyclic change in volume

			// - Mode : ['Tremolo - Triangular Wave', 'Tremolo - Square Wave', 'Pan - Triangular Wave', 'Pan - Square Wave']
			console.log('    Trem / Pan Type:', tremPanTypes[event.data[10]]);
			console.log('    Rate:', event.data[11]); // [0 ... 100]
			console.log('    Depth:', event.data[12]); // [0 ... 100]
			console.log(`    Balance: L${100 - event.data[13]}:${event.data[13]}R`);
			break;

		case 13:	// Reverb - 20 bytes
			console.log('    Reverb type:', reverbTypes[event.data[10]]);
			console.log('    RevTime:', event.data[11] / 10, 'seconds'); // [0.1 ... 10] sec
			console.log('    Predelay:', event.data[12], 'ms'); // [0 ... 100] ms
			// Low cut options: Flat, 55 Hz, 110 Hz, 165, 220 280 340 400 500 630 800
			console.log('    Low cut:', lowCutOptions[event.data[13]]);
			// Hi cut options: 500 630 800 1.00k 1.25k 1.60k 2.00k 2.50k 3.15k 4.00k 5.00k 6.30k 8.00k 10.0k 12.5k, Flat
			console.log('    Hi cut:', hiCutOptions[event.data[14]]);
			console.log('    Diffusion:', event.data[15]); // [0 ... 10]
			console.log('    Effect level:', event.data[16]); // [0 ... 100]
			console.log('    Direct level:', event.data[17]); // [0 ... 100]
			break;

		default:
			break;
	}

	// if (patchNum == 100 && messageNum == 13) {
	// 	console.log('\n**** The End ****\n');
	//
	// 	for (const debugMessage of debugMessages) {
	// 		console.log('debugMessage:', debugMessage);
	// 	}
	// }
}

function startLoggingMIDIInput(midiAccess /*, indexOfPort */) {

	for (const entry of midiAccess.inputs) {
		console.log('Adding MIDI message listener to input:', entry);
		entry[1].onmidimessage = onMIDIMessage;
	}
}

// MIDIOutput example
// From https://developer.mozilla.org/en-US/docs/Web/API/MIDIOutput

// The following example sends a middle C immediately on MIDI channel 1.

function sendMiddleC(midiAccess, portID) {
	const noteOnMessage = [0x90, 60, 0x7f];    // note on, middle C, full velocity
	const output = midiAccess.outputs.get(portID);

	output.send(noteOnMessage); // sends the message.
}

// Gaining access to the MIDI port

// The navigator.requestMIDIAccess() method returns a promise that resolves to a MIDIAccess object, which can then be used to access a MIDI device. The method must be called in a secure context.

let midi = null;  // global MIDIAccess object

function onMIDISuccess(midiAccess) {
	console.log("MIDI ready!");
	midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)

	midiAccess.onstatechange = (event) => {
		// Print information about the (dis)connected MIDI controller
		console.log('MIDI state change:', event.port.name, event.port.manufacturer, '; new state:', event.port.state);
	};

	listInputsAndOutputs(midiAccess);

	startLoggingMIDIInput(midiAccess);
}

function onMIDIFailure(msg) {
	console.error(`Failed to get MIDI access - ${msg}`);
}

// From https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMIDIAccess :

// MIDIOptions (Optional)
//
//     An Object representing options to pass into the method. These options are:
//
//     sysex
//
//         A Boolean value that, if set to true, allows the ability to send and receive system exclusive (sysex) messages. The default value is false.
//     software
//
//         A Boolean value that, if set to true, allows the system to utilize any installed software synthesizers. The default value is false.

const midiOptions = { sysex: true };

navigator.requestMIDIAccess(midiOptions)
	.then(onMIDISuccess, onMIDIFailure);

// End of File
