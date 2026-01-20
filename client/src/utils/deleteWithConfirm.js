import swal from "sweetalert";

export const deleteWithConfirm = async ({
  title = "Are you sure?",
  text = "This action cannot be undone!",
  confirmText = "Delete",
  apiCall,
  onSuccess,
  onError,
}) => {
  const willDelete = await swal({
    title,
    text,
    icon: "warning",
    buttons: ["Cancel", confirmText],
    dangerMode: true,
  });

  if (!willDelete) return;

  try {
    await apiCall();

    await swal({
      title: "Deleted!",
      text: "Record deleted successfully.",
      icon: "success",
      timer: 2000,
      buttons: false,
    });

    onSuccess && onSuccess();
  } catch (error) {
    swal(
      "Error",
      error.response?.data?.message || "Delete failed",
      "error"
    );

    onError && onError(error);
  }
};
