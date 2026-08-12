import streamDeck from "@elgato/streamdeck";
import { CounterAction, EffectAction } from "./actions.js";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new CounterAction());
streamDeck.actions.registerAction(new EffectAction());
streamDeck.connect();
