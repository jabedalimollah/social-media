import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { readFileAsDataURL } from "@/lib/utils";
import { Loader2 } from "lucide-react";
// import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { toast } from "react-toastify";

const CreatePost = ({ open, setOpen }) => {
  const [file, setFile] = useState("");
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { posts } = useSelector((state) => state.post);
  const imageRef = useRef();
  const dispatch = useDispatch();
  const fileChangeHandler = async (e) => {
    const file = e.target?.files[0];
    if (file) {
      setFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setImagePreview(dataUrl);
    }
  };
  const createPostHandler = async (e) => {
    const formData = new FormData();
    formData.append("caption", caption);
    if (imagePreview) {
      formData.append("image", file);
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_APP_API_KEY}/post/addpost`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      // console.log(res);
      if (res.data.statusInfo == "success") {
        dispatch(setPosts([...posts, res.data.data]));
        toast.success(res.data.message, {
          position: "top-center",
        });
        setOpen(false);
      }
    } catch (error) {
      // console.log(error);
      toast.error(error.response.data.message, {
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Dialog open={open}>
        <DialogContent onInteractOutside={() => setOpen(false)}>
          <DialogTitle className="hidden" />
          <DialogHeader className={"text-center font-semibold"}>
            Create New Post
          </DialogHeader>
          <div className="flex gap-3 items-center">
            <Avatar>
              <AvatarImage src={user?.profilePicture} alt="image" />
              <AvatarFallback>JAM</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-xs">{user?.username}</h1>
              <span className="text-gray-600 text-xs">Bio here...</span>
            </div>
          </div>
          <Textarea
            className="focus-visible:ring-transparent border-none"
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          {imagePreview && (
            <div className="w-full h-64 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="preview_image"
                className="object-cover h-full w-full rounded-md"
              />
            </div>
          )}
          <input
            type="file"
            ref={imageRef}
            className="hidden"
            onChange={fileChangeHandler}
          />
          <Button
            onClick={() => imageRef.current.click()}
            className="w-fit mx-auto bg-[#0095F6] hover:bg-[#3588bf]"
          >
            Select Image
            {/* from computer */}
          </Button>
          {imagePreview &&
            (loading ? (
              <Button>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={createPostHandler}
                className="w-full"
              >
                Post
              </Button>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreatePost;
