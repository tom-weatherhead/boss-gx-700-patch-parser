// boss-gx-700-patch-parser/src/script.js

// See https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API

// Secure context: This feature is available only in secure contexts (HTTPS), in some or all supporting browsers.

// The Web MIDI API connects to and interacts with Musical Instrument Digital Interface (MIDI) Devices.
//
// The interfaces deal with the practical aspects of sending and receiving MIDI messages. Therefore, the API can be used for musical and non-musical uses, with any MIDI device connected to your computer.

// Note: In Firefox the Web MIDI API is an add-on-gated feature. This means your website or app needs a site permission add-on for users to download, install and be able to access this API's functionality. Instructions on how to set up a site permission add-on can be found here:
//
// https://extensionworkshop.com/documentation/publish/site-permission-add-on/

// Listing inputs and outputs

// In this example the list of input and output ports are retrieved and printed to the console.

function listInputsAndOutputs(midiAccess) {
	// console.log('typeof midiAccess:', typeof midiAccess);
	// console.log('midiAccess:', midiAccess);
	//
	// console.log('typeof midiAccess.inputs:', typeof midiAccess.inputs);
	// console.log('midiAccess.inputs:', midiAccess.inputs);
	//
	// console.log('typeof midiAccess.outputs:', typeof midiAccess.outputs);
	// console.log('midiAccess.outputs:', midiAccess.outputs);

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

// Handling MIDI Input
//
// This example prints incoming MIDI messages on a single port to the console.

function onMIDIMessage(event) {
	let str = `MIDI message received at timestamp ${event.timeStamp}[${event.data.length} bytes]: `;

	for (const character of event.data) {
		str += `0x${character.toString(16)} `;
	}

	console.log(str);

	// Does the message begin with 0xf0 0x41 0x0 0x79 0x12 0x0 ?

	if (event.data.length < 15 ||
		event.data[0] != 0xf0 ||
		event.data[1] != 0x41 ||
		event.data[2] != 0 ||
		event.data[3] != 0x79 ||
		event.data[4] != 0x12 ||
		event.data[5] != 0
	) {
		console.error('**** Expected message header not found ****');
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

	console.log('GX-700 SysEx message');
	console.log('  Patch number', patchNum);
	console.log('  Patch message', messageNum);

	if (messageNum >= expectedMessageLengths.length) {
		console.error('**** Bad message number ****');
		return;
	} else if (event.data.length != expectedMessageLengths[messageNum]) {
		console.error('**** Bad message length ****');
		return;
	}

	if (event.data[event.data.length - 1] != 0xf7) {
		console.error('**** Last byte in message is not 0xf7 ****');
		return;
	}

	if (messageNum == 0) {
		// Handle the patch's header message.

		// The patch name is 12 characters long.
		console.log('  Patch name:', new TextDecoder().decode(event.data.slice(23, 35)));

		// Bytes 35-74 should be:
		// 03 07 00 00 00 64 00 00 00 7F 03 07 00 00 00 64
		// 0B 00 00 7F 00 00 00 00 00 64 01 00 00 7F 00 00
		// 00 00 00 64 24 00 00 7F

		// ... followed by a checksum byte (?), followed by the terminating 0xf7

		return;
	}

	if (event.data[8] != 0) {
		console.error('**** event.data[8] != 0 ****');
		return;
	}

	if (event.data[9] != 0 && event.data[9] != 1) {
		console.error('**** event.data[9] (patch section enabled/disabled) is neither zero nor one ****');
		return;
	}

	const patchSectionEnabled = event.data[9] != 0;

	console.log('  Patch number', patchNum, '-', patchSectionNames[messageNum], '-', patchSectionEnabled ? 'Enabled' : 'Disabled');

	if (!patchSectionEnabled) {
		return;
	}

	const distortionTypes = ['Vintage OD', 'Turbo OD', 'Blues', 'Distortion', 'Turbo DS', 'Metal', 'Fuzz'];

	const reverbTypes = ['Room1', 'Room2', 'Hall1', 'Hall2', 'Plate'];

	switch (messageNum) {
		case 1:		// Compression - 19 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			console.log('    Byte 14:', event.data[14]);
			console.log('    Byte 15:', event.data[15]);
			console.log('    Byte 16:', event.data[16]);
			break;

		case 2:		// Wah - 24 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			console.log('    Byte 14:', event.data[14]);
			console.log('    Byte 15:', event.data[15]);
			console.log('    Byte 16:', event.data[16]);
			console.log('    Byte 17:', event.data[17]);
			console.log('    Byte 18:', event.data[18]);
			console.log('    Byte 19:', event.data[19]);
			console.log('    Byte 20:', event.data[20]);
			console.log('    Byte 21:', event.data[21]);
			break;

		case 3:		// Overdrive / Distortion - 17 bytes
			console.log('    Distortion type:', distortionTypes[event.data[10]]);
			console.log('    Drive:', event.data[11]);
			console.log('    Bass:', event.data[12] - 50);
			console.log('    Treble:', event.data[13] - 50);
			console.log('    Effect level:', event.data[14]);
			break;

		case 4:		// Preamp - 21 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			console.log('    Byte 14:', event.data[14]);
			console.log('    Byte 15:', event.data[15]);
			console.log('    Byte 16:', event.data[16]);
			console.log('    Byte 17:', event.data[17]);
			console.log('    Byte 18:', event.data[18]);
			break;

		case 5:		// Loop - 15 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			break;

		case 6:		// Equalization - 18 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			console.log('    Byte 14:', event.data[14]);
			console.log('    Byte 15:', event.data[15]);
			break;

		case 7:		// Speaker Simulation - 16 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			break;

		case 8:		// Noise Suppression - 16 bytes
			console.log('    Threshold:', event.data[10]);
			console.log('    Release:', event.data[11]);
			console.log('    Byte 12:', event.data[12], '(0 = Guitar in, 1 = NS in?)');
			console.log('    Effect level:', event.data[13]);
			break;

		case 9:		// Modulation - 88 bytes
			console.log('    Modulation - 88 bytes, 76 of which describe the modulation settings');
			break;

		case 10:	// Delay - 32 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			console.log('    Byte 14:', event.data[14]);
			console.log('    Byte 15:', event.data[15]);
			console.log('    Byte 16:', event.data[16]);
			console.log('    Byte 17:', event.data[17]);
			console.log('    Byte 18:', event.data[18]);
			console.log('    Byte 19:', event.data[19]);
			console.log('    Byte 20:', event.data[20]);
			console.log('    Byte 21:', event.data[21]);
			console.log('    Byte 22:', event.data[22]);
			console.log('    Byte 23:', event.data[23]);
			console.log('    Byte 24:', event.data[24]);
			console.log('    Byte 25:', event.data[25]);
			console.log('    Byte 26:', event.data[26]);
			console.log('    Byte 27:', event.data[27]);
			console.log('    Byte 28:', event.data[28]);
			console.log('    Byte 29:', event.data[29]);
			break;

		case 11:	// Chorus - 20 bytes
			console.log('    Byte 10:', event.data[10], '(Mode? (0 = mono, 1 = stereo ?))');
			console.log('    Rate:', event.data[11]);
			console.log('    Depth:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			console.log('    Byte 14:', event.data[14]);
			console.log('    Byte 15:', event.data[15]);
			console.log('    Byte 16:', event.data[16]);
			console.log('    Effect level:', event.data[17]);
			break;

		case 12:	// Tremolo / Panning - 16 bytes
			console.log('    Byte 10:', event.data[10]);
			console.log('    Byte 11:', event.data[11]);
			console.log('    Byte 12:', event.data[12]);
			console.log('    Byte 13:', event.data[13]);
			break;

		case 13:	// Reverb - 20 bytes
			console.log('    Reverb type:', reverbTypes[event.data[10]]);
			console.log('    RevTime:', event.data[11] / 10, 'seconds');
			console.log('    Predelay:', event.data[12], 'ms');
			console.log('    Byte 13 (Low cut):', event.data[13], '(0 = flat ?)');
			console.log('    Byte 14 (Hi cut):', event.data[14], '(6 = 2.00 kHz ?)');
			console.log('    Diffusion:', event.data[15]);
			console.log('    Effect level:', event.data[16]);
			console.log('    Direct level:', event.data[17]);
			break;

		default:
			break;
	}
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
