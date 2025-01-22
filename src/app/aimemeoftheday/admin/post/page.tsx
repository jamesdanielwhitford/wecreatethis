// src/app/aimemeoftheday/admin/post/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { storage, db } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import styles from "./page.module.css";

export default function PostForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: "",
    prompt: "",
    caption: "",
    companyName: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!loading && !user) {
    router.push("/aimemeoftheday/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError("Image is required");
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload image
      const imageRef = ref(storage, `memes/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      // Upload logo if exists
      let companyLogoUrl = "";
      if (companyLogo) {
        const logoRef = ref(storage, `logos/${Date.now()}-${companyLogo.name}`);
        await uploadBytes(logoRef, companyLogo);
        companyLogoUrl = await getDownloadURL(logoRef);
      }

      // Add post to Firestore
      await addDoc(collection(db, "posts"), {
        ...formData,
        imageUrl,
        companyLogoUrl,
        createdAt: Date.now(),
      });

      router.push("/aimemeoftheday");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1>Create New Post</h1>
        {error && <div className={styles.error}>{error}</div>}
        
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
        />

        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />

        <textarea
          placeholder="Caption (optional)"
          value={formData.caption}
          onChange={(e) => setFormData({...formData, caption: e.target.value})}
        />

        <textarea
          placeholder="Prompt"
          required
          value={formData.prompt}
          onChange={(e) => setFormData({...formData, prompt: e.target.value})}
        />

        <input
          type="text"
          placeholder="Company Name"
          required
          value={formData.companyName}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCompanyLogo(e.target.files?.[0] || null)}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}