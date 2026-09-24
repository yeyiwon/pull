# Moru conversation v1

Small temporary input → grounded context → local MockConversationAdapter → independently validated speech/action → existing character expression broker. No external model or network request is used. Context retains eight session turns and eight recent world events. Production speech is text only, with no bubble background, border, tail or decorative star.

Composing/thinking/speaking temporarily pauses autonomous reactions and player input. Closing, Escape, timeout and unmount release the session; cancellation ignores late results. Four-second provider timeout uses a local short fallback. The provider interface allows a future server integration without changing world controls. Emotion is metadata, not a claim of facial morph capability.

Development-only Moru Brain details expose conversation context, raw/parsed response and rejected fields. Unit tests cover field isolation, actual world context, timeout, cancellation, duplicate submissions and bounded history. Desktop browser input, response typography, fading and Escape were inspected. Actual iPhone keyboard behavior remains unverified.
