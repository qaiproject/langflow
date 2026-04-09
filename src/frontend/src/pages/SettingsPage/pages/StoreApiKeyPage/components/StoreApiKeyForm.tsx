import * as Form from "@radix-ui/react-form";
import { useTranslation } from "react-i18next";
import InputComponent from "../../../../../components/core/parameterRenderComponent/components/inputComponent";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";

type StoreApiKeyFormComponentProps = {
  apikey: string;
  handleInput: (event: {
    target: {
      name: string;
      value: string;
    };
  }) => void;
  handleSaveKey: (
    apikey: string,
    handleInput: (event: {
      target: {
        name: string;
        value: string;
      };
    }) => void,
  ) => void;
  loadingApiKey: boolean;
  validApiKey: boolean;
  hasApiKey: boolean;
};
const StoreApiKeyFormComponent = ({
  apikey,
  handleInput,
  handleSaveKey,
  loadingApiKey,
  validApiKey,
  hasApiKey,
}: StoreApiKeyFormComponentProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Form.Root
        onSubmit={(event) => {
          event.preventDefault();
          handleSaveKey(apikey, handleInput);
        }}
      >
        <Card x-chunk="dashboard-04-chunk-2" id="api">
          <CardHeader>
            <CardTitle>{t("storeApiKey.title")}</CardTitle>
            <CardDescription>
              {hasApiKey && !validApiKey ? `${t("storeApiKey.invalidPrefix")} ` : ""}
              {!hasApiKey ? `${t("storeApiKey.noKeyPrefix")} ` : ""}
              {t("storeApiKey.insertKeySuffix")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full gap-4">
                <Form.Field name="apikey" className="w-full">
                  <InputComponent
                    id="apikey"
                    onChange={(value) => {
                      handleInput({ target: { name: "apikey", value } });
                    }}
                    value={apikey}
                    isForm
                    password={true}
                    placeholder={t("storeApiKey.placeholder")}
                    className="w-full"
                  />
                  <Form.Message match="valueMissing" className="field-invalid">
                    {t("storeApiKey.enterApiKey")}
                  </Form.Message>
                </Form.Field>
              </div>
              <span className="pr-1 text-xs text-muted-foreground">
                {t("storeApiKey.createApiKeyPrefix")}{" "}
                <a
                  className="text-high-indigo underline"
                  href="https://langflow.store/"
                  target="_blank"
                  rel="noopener"
                >
                  langflow.store
                </a>
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Form.Submit asChild>
              <Button
                loading={loadingApiKey}
                type="submit"
                data-testid="api-key-save-button-store"
              >
                {t("common.save")}
              </Button>
            </Form.Submit>
          </CardFooter>
        </Card>
      </Form.Root>
    </>
  );
};
export default StoreApiKeyFormComponent;
