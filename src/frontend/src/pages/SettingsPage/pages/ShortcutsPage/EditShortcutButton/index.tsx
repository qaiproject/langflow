import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import RenderKey from "@/components/common/renderIconComponent/components/renderKey";
import ForwardedIconComponent from "../../../../../components/common/genericIconComponent";
import { Button } from "../../../../../components/ui/button";
import BaseModal from "../../../../../modals/baseModal";
import useAlertStore from "../../../../../stores/alertStore";
import { useShortcutsStore } from "../../../../../stores/shortcuts";
import { toCamelCase } from "../../../../../utils/utils";
import {
  checkForKeys,
  findShortcutByName,
  getFixedCombination,
  isDuplicateCombination,
  normalizeRecordedCombination,
} from "./helpers";
import { translateShortcutName } from "../translate-shortcut-name";

export default function EditShortcutButton({
  children,
  shortcut,
  shortcuts,
  defaultShortcuts,
  open,
  setOpen,
  disable,
  setSelected,
}: {
  children: JSX.Element;
  shortcut: string[];
  shortcuts: Array<{
    name: string;
    shortcut: string;
    display_name: string;
  }>;
  defaultShortcuts: Array<{
    name: string;
    shortcut: string;
    display_name: string;
  }>;
  open: boolean;
  setOpen: (bool: boolean) => void;
  disable?: boolean;
  setSelected: (selected: string[]) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const shortcutInitialValue = findShortcutByName(
    shortcuts,
    shortcut[0],
  )?.shortcut;
  const [key, setKey] = useState<string | null>(null);
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setShortcuts = useShortcutsStore((state) => state.setShortcuts);
  const setErrorData = useAlertStore((state) => state.setErrorData);

  const setUniqueShortcut = useShortcutsStore(
    (state) => state.updateUniqueShortcut,
  );

  function applyShortcutUpdate(newCombination: string, successTitle: string) {
    const nextShortcuts = shortcuts.map((s) => {
      if (s.name === shortcut[0]) {
        return {
          name: s.name,
          display_name: s.display_name,
          shortcut: newCombination,
        };
      }
      return {
        name: s.name,
        display_name: s.display_name,
        shortcut: s.shortcut,
      };
    });
    const shortcutName = toCamelCase(shortcut[0]);
    setUniqueShortcut(shortcutName, newCombination);
    setShortcuts(nextShortcuts);
    localStorage.setItem("langflow-shortcuts", JSON.stringify(nextShortcuts));
    setKey(null);
    setOpen(false);
    setSuccessData({
      title: successTitle,
    });
  }

  function editCombination(): void {
    if (!key) {
      setErrorData({
        title: t("shortcuts.errorSavingCombination"),
        list: [t("shortcuts.noKeyCombinationRecorded")],
      });
      return;
    }
    const normalizedCombination = normalizeRecordedCombination(key);
    if (isDuplicateCombination(shortcuts, shortcut[0], normalizedCombination)) {
      setErrorData({
        title: t("shortcuts.errorSavingCombination"),
        list: [t("shortcuts.combinationAlreadyExists")],
      });
      return;
    }
    const translatedShortcutName = translateShortcutName(shortcut[0], t);
    applyShortcutUpdate(
      normalizedCombination,
      t("shortcuts.shortcutChanged", { name: translatedShortcutName }),
    );
  }

  useEffect(() => {
    if (!open) {
      setKey(null);
      setSelected([]);
    }
  }, [open, setOpen, key]);

  function handleResetToDefault(): void {
    const defaultShortcut = findShortcutByName(
      defaultShortcuts,
      shortcut[0],
    )?.shortcut;
    if (!defaultShortcut) {
      setErrorData({
        title: t("shortcuts.errorResettingShortcut"),
        list: [t("shortcuts.defaultShortcutNotFound")],
      });
      return;
    }
    if (isDuplicateCombination(shortcuts, shortcut[0], defaultShortcut)) {
      setErrorData({
        title: t("shortcuts.errorResettingShortcut"),
        list: [t("shortcuts.combinationAlreadyExists")],
      });
      return;
    }
    const translatedShortcutName = translateShortcutName(shortcut[0], t);
    applyShortcutUpdate(
      defaultShortcut,
      t("shortcuts.shortcutReset", { name: translatedShortcutName }),
    );
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      let fixedKey = e.key;
      if (e.key?.toLowerCase() === "control") {
        fixedKey = "Ctrl";
      }
      if (e.key?.toLowerCase() === "meta") {
        fixedKey = "Cmd";
      }
      if (e.key?.toLowerCase() === " ") {
        fixedKey = "Space";
      }
      if (key) {
        if (checkForKeys(key, fixedKey)) return;
      }
      setKey((oldKey) => getFixedCombination(oldKey, fixedKey));
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [key, setKey]);

  return (
    <BaseModal open={open} setOpen={setOpen} size="x-small" disable={disable}>
      <BaseModal.Header description={t("shortcuts.recordingKeyboard")}>
        <span className="pr-2">{t("shortcuts.keyCombination")}</span>
        <ForwardedIconComponent
          name="Keyboard"
          className="h-6 w-6 pl-1 text-primary"
          aria-hidden="true"
        />
      </BaseModal.Header>
      <BaseModal.Trigger>{children}</BaseModal.Trigger>
      <BaseModal.Content>
        <div className="align-center flex h-full w-full justify-center gap-4 rounded-md border border-border py-2">
          <div className="flex items-center justify-center gap-0.5 text-center text-lg font-bold">
            {(key ?? shortcutInitialValue ?? "").split("+").map((k, i) => (
              <RenderKey key={i} value={k} tableRender />
            ))}
          </div>
        </div>
      </BaseModal.Content>
      <BaseModal.Footer>
        <Button variant={"default"} onClick={editCombination}>
          {t("shortcuts.apply")}
        </Button>
        <Button
          className="mr-5"
          variant={"destructive"}
          onClick={handleResetToDefault}
        >
          {t("shortcuts.reset")}
        </Button>
      </BaseModal.Footer>
    </BaseModal>
  );
}
