import * as Form from "@radix-ui/react-form";
import { useTranslation } from "react-i18next";
import InputComponent from "../../../../../../components/core/parameterRenderComponent/components/inputComponent";
import { Button } from "../../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../../../../components/ui/card";

type PasswordFormComponentProps = {
  password: string;
  cnfPassword: string;
  handleInput: (event: {
    target: {
      name: string;
      value: string;
    };
  }) => void;
  handlePatchPassword: (
    password: string,
    cnfPassword: string,
    handleInput: (event: {
      target: {
        name: string;
        value: string;
      };
    }) => void,
  ) => void;
};
const PasswordFormComponent = ({
  password,
  cnfPassword,
  handleInput,
  handlePatchPassword,
}: PasswordFormComponentProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Form.Root
        onSubmit={(event) => {
          handlePatchPassword(password, cnfPassword, handleInput);
          event.preventDefault();
        }}
      >
        <Card x-chunk="dashboard-04-chunk-2">
          <CardHeader>
            <CardTitle>{t("passwordForm.title")}</CardTitle>
            <CardDescription>
              {t("passwordForm.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full gap-4">
              <Form.Field name="password" className="w-full">
                <InputComponent
                  id="pasword"
                  onChange={(value) => {
                    handleInput({ target: { name: "password", value } });
                  }}
                  value={password}
                  isForm
                  password={true}
                  placeholder={t("auth.password")}
                  className="w-full"
                />
                <Form.Message match="valueMissing" className="field-invalid">
                  {t("auth.enterPassword")}
                </Form.Message>
              </Form.Field>
              <Form.Field name="cnfPassword" className="w-full">
                <InputComponent
                  id="cnfPassword"
                  onChange={(value) => {
                    handleInput({
                      target: { name: "cnfPassword", value },
                    });
                  }}
                  value={cnfPassword}
                  isForm
                  password={true}
                  placeholder={t("auth.confirmPassword")}
                  className="w-full"
                />

                <Form.Message className="field-invalid" match="valueMissing">
                  {t("auth.confirmYourPassword")}
                </Form.Message>
              </Form.Field>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Form.Submit asChild>
              <Button type="submit">{t("common.save")}</Button>
            </Form.Submit>
          </CardFooter>
        </Card>
      </Form.Root>
    </>
  );
};
export default PasswordFormComponent;
