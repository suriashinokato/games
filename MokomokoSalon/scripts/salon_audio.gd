extends Node
## Original synthesized chimes. No microphone, network, or external sound files.
var enabled := true
var player: AudioStreamPlayer
var clips: Dictionary = {}

func _ready() -> void:
	player = AudioStreamPlayer.new()
	player.volume_db = -17
	add_child(player)
	clips["tap"] = make_clip([784.0], 0.07)
	clips["welcome"] = make_clip([523.25, 659.25, 783.99], 0.11)
	clips["good"] = make_clip([523.25, 659.25, 783.99, 1046.5], 0.15)
	clips["soft"] = make_clip([523.25, 659.25], 0.18)

func make_clip(notes: Array, duration: float) -> AudioStreamWAV:
	var rate := 22050
	var frames := int(rate * duration)
	var bytes := PackedByteArray()
	bytes.resize(frames * notes.size() * 2)
	for n in range(notes.size()):
		for i in range(frames):
			var t := float(i) / rate
			var envelope := minf(t / 0.008, 1.0) * pow(1.0 - float(i) / frames, 2.0)
			var value := (sin(TAU * notes[n] * t) + sin(TAU * notes[n] * 2 * t) * 0.18) * envelope * 0.6
			bytes.encode_s16((n * frames + i) * 2, int(value * 32767))
	var clip := AudioStreamWAV.new()
	clip.format = AudioStreamWAV.FORMAT_16_BITS
	clip.mix_rate = rate
	clip.data = bytes
	return clip

func play(cue: String) -> void:
	if not enabled or not clips.has(cue):
		return
	player.stream = clips[cue]
	player.play()

func stop_all() -> void:
	if is_instance_valid(player):
		player.stop()
		player.stream = null

func _exit_tree() -> void:
	stop_all()
	clips.clear()
