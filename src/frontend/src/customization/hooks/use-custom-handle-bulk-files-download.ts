import { useTranslation } from "react-i18next";
import { useGetDownloadFilesV2 } from "@/controllers/API/queries/file-management/use-get-download-files";

export const useCustomHandleBulkFilesDownload = () => {
  const { t } = useTranslation();
  const { mutate: downloadFiles } = useGetDownloadFilesV2();

  const handleBulkDownload = async (
    selectedFiles: any,
    setSuccessData: (data: { title: string }) => void,
    setErrorData: (data: { title: string; list: string[] }) => void,
    setIsDownloading: (isDownloading: boolean) => void,
  ) => {
    setIsDownloading(true);
    downloadFiles(
      {
        ids: selectedFiles.map((file) => file.id),
      },
      {
        onSuccess: (data) => {
          setSuccessData({ title: data.message });
          setIsDownloading(false);
        },
        onError: (error) => {
          setErrorData({
            title: t("filesPage.errorDownloadingFiles"),
            list: [error.message || t("filesPage.genericDownloadError")],
          });
          setIsDownloading(false);
        },
      },
    );
  };

  return { handleBulkDownload };
};
