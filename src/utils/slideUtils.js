/**
 * Processes uploaded image files into slide objects
 * with precomputed base64 data for sending to Gemini.
 */
export async function processSlideFiles(files) {
  const newSlides = [];

  for (const file of files) {
    const url = URL.createObjectURL(file);

    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1280 / img.width, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    newSlides.push({ url, base64, mimeType: "image/jpeg" });
  }

  return newSlides;
}