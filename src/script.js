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

	if (event.data.length >= 8 &&
		event.data[0] == 0xf0 &&
		event.data[1] == 0x41 &&
		event.data[2] == 0 &&
		event.data[3] == 0x79 &&
		event.data[4] == 0x12 &&
		event.data[5] == 0
	) {
		const messageNum = event.data[7];
		const expectedMessageLengths = [77, 19, 24, 17, 21, 15, 18, 16, 16, 88, 32, 20, 16, 20];

		console.log('GX-700 SysEx message');
		console.log('  Patch number', event.data[6] + 1);
		console.log('  Patch message', messageNum);

		if (messageNum >= expectedMessageLengths.length) {
			console.error('**** Bad message number ****');
			return;
		} else if (event.data.length != expectedMessageLengths[messageNum]) {
			console.error('**** Bad message length ****');
			return;
		}

		switch (messageNum) {
			case 0:
				console.log('  Patch name:', new TextDecoder().decode(event.data.slice(23, 35)));
				break;

			default:
				break;
		}
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
