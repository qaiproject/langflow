import i18n from "../i18n";

// ERROR
export const MISSED_ERROR_ALERT = i18n.t("alerts.error.missedSomething");
export const INCOMPLETE_LOOP_ERROR_ALERT =
  i18n.t("alerts.error.incompleteLoop");
export const INVALID_FILE_ALERT =
  i18n.t("alerts.error.invalidFile");
export const CONSOLE_ERROR_MSG = i18n.t("alerts.error.uploadConsole");
export const CONSOLE_SUCCESS_MSG = i18n.t("alerts.success.uploadConsole");
export const INFO_MISSING_ALERT =
  i18n.t("alerts.error.missingInfo");
export const FUNC_ERROR_ALERT = i18n.t("alerts.error.function");
export const IMPORT_ERROR_ALERT = i18n.t("alerts.error.imports");
export const BUG_ALERT = i18n.t("alerts.error.generic");
export const CODE_ERROR_ALERT =
  i18n.t("alerts.error.code");
export const CHAT_ERROR_ALERT =
  i18n.t("alerts.error.chat");
export const MSG_ERROR_ALERT = i18n.t("alerts.error.message");
export const PROMPT_ERROR_ALERT =
  i18n.t("alerts.error.prompt");
export const API_ERROR_ALERT =
  i18n.t("alerts.error.apiSave");
export const USER_DEL_ERROR_ALERT = i18n.t("alerts.error.deleteUser");
export const USER_EDIT_ERROR_ALERT = i18n.t("alerts.error.editUser");
export const USER_ADD_ERROR_ALERT = i18n.t("alerts.error.addUser");
export const SIGNIN_ERROR_ALERT = i18n.t("alerts.error.signIn");
export const DEL_KEY_ERROR_ALERT = i18n.t("alerts.error.deleteKey");
export const DEL_KEY_ERROR_ALERT_PLURAL = i18n.t("alerts.error.deleteKeys");
export const UPLOAD_ERROR_ALERT = i18n.t("alerts.error.uploadFile");
export const WRONG_FILE_ERROR_ALERT = i18n.t("alerts.error.wrongFileType");
export const UPLOAD_ALERT_LIST = i18n.t("alerts.error.uploadJson");
export const INVALID_SELECTION_ERROR_ALERT = i18n.t("alerts.error.invalidSelection");
export const EDIT_PASSWORD_ERROR_ALERT = i18n.t("alerts.error.changePassword");
export const EDIT_PASSWORD_ALERT_LIST = i18n.t("alerts.error.passwordMismatch");
export const SAVE_ERROR_ALERT = i18n.t("alerts.error.saveChanges");
export const PROFILE_PICTURES_GET_ERROR_ALERT =
  i18n.t("alerts.error.profilePictures");
export const SIGNUP_ERROR_ALERT = i18n.t("alerts.error.signUp");
export const APIKEY_ERROR_ALERT = i18n.t("alerts.error.apiKey");
export const NOAPI_ERROR_ALERT =
  i18n.t("alerts.error.noApiKey");
export const INVALID_API_ERROR_ALERT =
  i18n.t("alerts.error.invalidApiKey");
export const COMPONENTS_ERROR_ALERT = i18n.t("alerts.error.components");

// NOTICE
export const NOCHATOUTPUT_NOTICE_ALERT =
  i18n.t("alerts.notice.noChatOutput");
export const API_WARNING_NOTICE_ALERT =
  i18n.t("alerts.notice.apiWarning");
export const COPIED_NOTICE_ALERT = i18n.t("alerts.notice.copiedApiKey");
export const TEMP_NOTICE_ALERT = i18n.t("alerts.notice.noVariables");

// SUCCESS
export const CODE_SUCCESS_ALERT = i18n.t("alerts.success.codeReady");
export const PROMPT_SUCCESS_ALERT = i18n.t("alerts.success.promptReady");
export const API_SUCCESS_ALERT = i18n.t("alerts.success.apiSaved");
export const USER_DEL_SUCCESS_ALERT = i18n.t("alerts.success.userDeleted");
export const USER_EDIT_SUCCESS_ALERT = i18n.t("alerts.success.userEdited");
export const USER_ADD_SUCCESS_ALERT = i18n.t("alerts.success.userAdded");
export const DEL_KEY_SUCCESS_ALERT = i18n.t("alerts.success.keyDeleted");
export const DEL_KEY_SUCCESS_ALERT_PLURAL = i18n.t("alerts.success.keysDeleted");
export const FLOW_BUILD_SUCCESS_ALERT = i18n.t("alerts.success.flowBuilt");
export const SAVE_SUCCESS_ALERT = i18n.t("alerts.success.changesSaved");
export const INVALID_FILE_SIZE_ALERT = (maxSizeMB) => {
  return i18n.t("alerts.error.invalidFileSize", { maxSizeMB });
};
