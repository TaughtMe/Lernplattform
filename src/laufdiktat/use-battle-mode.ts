"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttackType, BattleOptions } from "./types.ts";
import { pickAttackCandidates } from "./attack-candidates.ts";

const ATTACK_DURATION_MS = 15000;
const CHARGE_PER_WORD = 25; // ~4 words to full charge (fast students)
const CHARGE_PER_WORD_SLOW = 34; // ~3 words to full charge (students behind)

export interface InkSplat {
  id: number;
  top: string;
  left: string;
  width: string;
  height: string;
  borderRadius: string;
  rotation: number;
}

function generateInkSplat(): InkSplat {
  return {
    id: Math.random(),
    top: `${Math.random() * 40 + 30}%`,
    left: `${Math.random() * 60 + 20}%`,
    width: `${Math.random() * 80 + 80}px`,
    height: `${Math.random() * 60 + 60}px`,
    borderRadius: `${Math.random() * 30 + 40}% ${Math.random() * 30 + 40}% ${Math.random() * 30 + 50}% ${Math.random() * 30 + 30}% / ${Math.random() * 30 + 40}% ${Math.random() * 30 + 50}% ${Math.random() * 30 + 60}% ${Math.random() * 30 + 40}%`,
    rotation: Math.random() * 360,
  };
}

interface UseBattleModeArgs {
  studentName: string | undefined;
  currentWordIndex: number;
  battleOptions: BattleOptions;
  roster: Record<string, number>;
  sendAttack: (to: string, type: AttackType) => boolean;
}

/**
 * Battle mechanics: charge bar, shield, active attack, target picker, ink
 * overlay and toasts. Ported from TaughtMe/Laufdiktat's
 * hooks/battle/useBattleMode.ts.
 */
export function useBattleMode({ studentName, currentWordIndex, battleOptions, roster, sendAttack }: UseBattleModeArgs) {
  const [charge, setCharge] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [activeAttack, setActiveAttack] = useState<{ type: AttackType; until: number } | null>(null);
  const [picker, setPicker] = useState<AttackType | null>(null);
  const [inkSplats, setInkSplats] = useState<InkSplat[]>([]);
  const [battleToast, setBattleToast] = useState<string | null>(null);

  const shieldRef = useRef(false);
  const activeAttackRef = useRef<{ type: AttackType; until: number } | null>(null);
  const attackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    shieldRef.current = shieldActive;
  }, [shieldActive]);
  useEffect(() => {
    activeAttackRef.current = activeAttack;
  }, [activeAttack]);
  useEffect(
    () => () => {
      if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const showBattleToast = useCallback((msg: string) => {
    setBattleToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setBattleToast(null), 2500);
  }, []);

  const chargeGain = () => {
    const others = Object.entries(roster).filter(([n]) => n !== studentName);
    const total = others.length + 1;
    const ahead = others.filter(([, i]) => i > currentWordIndex).length;
    const isBehind = total > 1 && ahead >= total / 2;
    return isBehind ? CHARGE_PER_WORD_SLOW : CHARGE_PER_WORD;
  };

  const fillCharge = () => setCharge((c) => Math.min(100, c + chargeGain()));

  const launchAttack = (targetName: string) => {
    if (!picker) return;
    if (!sendAttack(targetName, picker)) return;
    setCharge(0);
    setPicker(null);
    showBattleToast(`Angriff auf ${targetName} gestartet!`);
  };

  const raiseShield = () => {
    if (charge < 100) return;
    setShieldActive(true);
    setCharge(0);
    showBattleToast("🛡️ Schild aktiviert");
  };

  const onAttack = useCallback(
    (type: AttackType) => {
      if (shieldRef.current) {
        setShieldActive(false);
        showBattleToast("🛡️ Angriff geblockt!");
        return;
      }
      if (activeAttackRef.current && activeAttackRef.current.until > Date.now()) return;

      setActiveAttack({ type, until: Date.now() + ATTACK_DURATION_MS });
      showBattleToast(type === "ink" ? "🖋️ Tinten-Angriff!" : "✨ Flimmer-Angriff!");
      if (type === "ink") {
        setInkSplats([generateInkSplat(), generateInkSplat(), generateInkSplat()]);
      }
      if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
      attackTimerRef.current = setTimeout(() => {
        setActiveAttack(null);
        setInkSplats([]);
      }, ATTACK_DURATION_MS);
    },
    [showBattleToast],
  );

  const availableAttacks: AttackType[] = [];
  if (battleOptions.ink) availableAttacks.push("ink");
  if (battleOptions.flicker) availableAttacks.push("flicker");
  if (availableAttacks.length === 0) availableAttacks.push("ink", "flicker");

  const chargeReady = charge >= 100;
  const attackCandidates = picker ? pickAttackCandidates(roster, studentName, currentWordIndex) : [];
  const isFlickerActive = activeAttack?.type === "flicker";

  return {
    charge,
    chargeReady,
    shieldActive,
    activeAttack,
    picker,
    setPicker,
    inkSplats,
    battleToast,
    availableAttacks,
    attackCandidates,
    isFlickerActive,
    fillCharge,
    launchAttack,
    raiseShield,
    onAttack,
  };
}
