/* Local profile/reference image cropping. No network or model request. */
(() => {
  "use strict";
  async function crop(
    source,
    { aspect = 1, title = "裁剪图片", output = 640, type = "image/webp" } = {},
  ) {
    let owned = typeof source !== "string",
      url = owned ? URL.createObjectURL(source) : source;
    const image = await new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = () => reject(Error("无法读取图片，请下载后从相册导入"));
      im.src = url;
    }).catch((e) => {
      if (owned) URL.revokeObjectURL(url);
      throw e;
    });
    return new Promise((resolve) => {
      const shade = document.createElement("div");
      shade.style.cssText =
        "position:fixed;inset:0;z-index:48000;background:#0007;display:flex;align-items:center;justify-content:center;padding:16px";
      const box = document.createElement("section");
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-label", title);
      box.setAttribute("aria-modal", "true");
      box.style.cssText =
        "background:white;color:#0f1419;border-radius:18px;padding:18px;width:min(100%,420px);max-height:90dvh;overflow:auto;font:14px/1.5 system-ui";
      const heading = document.createElement("strong");
      heading.textContent = title;
      box.append(heading);
      const note = document.createElement("p");
      note.textContent = "拖动图片调整位置，滑动缩放。";
      box.append(note);
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = Math.round(360 / aspect);
      canvas.setAttribute("aria-label", "裁剪预览");
      canvas.style.cssText =
        "display:block;width:100%;height:auto;touch-action:none;background:#e9edef;border-radius:8px";
      box.append(canvas);
      const zoomLabel = document.createElement("label");
      zoomLabel.textContent = "缩放";
      const zoom = document.createElement("input");
      zoom.type = "range";
      zoom.min = "1";
      zoom.max = "4";
      zoom.step = ".01";
      zoom.value = "1";
      zoom.setAttribute("aria-label", "裁剪缩放");
      zoom.style.width = "100%";
      zoomLabel.append(zoom);
      box.append(zoomLabel);
      let scale = 1,
        x = 0,
        y = 0,
        drag;
      const base = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      function dimensions() {
        return [
          image.naturalWidth * base * scale,
          image.naturalHeight * base * scale,
        ];
      }
      function draw() {
        const [w, h] = dimensions();
        x = Math.max(
          -(w - canvas.width) / 2,
          Math.min((w - canvas.width) / 2, x),
        );
        y = Math.max(
          -(h - canvas.height) / 2,
          Math.min((h - canvas.height) / 2, y),
        );
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          image,
          (canvas.width - w) / 2 + x,
          (canvas.height - h) / 2 + y,
          w,
          h,
        );
      }
      zoom.oninput = () => {
        scale = Number(zoom.value);
        draw();
      };
      canvas.onpointerdown = (e) => {
        canvas.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, startX: x, startY: y };
      };
      canvas.onpointermove = (e) => {
        if (!drag) return;
        const ratio = canvas.width / canvas.getBoundingClientRect().width;
        x = drag.startX + (e.clientX - drag.x) * ratio;
        y = drag.startY + (e.clientY - drag.y) * ratio;
        draw();
      };
      canvas.onpointerup = canvas.onpointercancel = () => {
        drag = null;
      };
      let done = false;
      function finish(value) {
        if (done) return;
        done = true;
        shade.remove();
        document.removeEventListener("keydown", escape);
        if (owned) URL.revokeObjectURL(url);
        resolve(value);
      }
      function escape(e) {
        if (e.key === "Escape") finish(null);
      }
      function button(text, fn) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = text;
        b.style.cssText =
          "border:1px solid #cfd9de;border-radius:18px;padding:8px 15px;background:white;color:#0f1419;margin:12px 8px 0 0";
        b.onclick = fn;
        box.append(b);
      }
      button("取消", () => finish(null));
      button("重置", () => {
        scale = 1;
        x = y = 0;
        zoom.value = "1";
        draw();
      });
      button("使用裁剪图片", () => {
        try {
          const out = document.createElement("canvas");
          out.width = output;
          out.height = Math.round(output / aspect);
          const [w, h] = dimensions();
          const ratio = base * scale;
          out
            .getContext("2d")
            .drawImage(
              image,
              ((w - canvas.width) / 2 - x) / ratio,
              ((h - canvas.height) / 2 - y) / ratio,
              canvas.width / ratio,
              canvas.height / ratio,
              0,
              0,
              out.width,
              out.height,
            );
          finish(out.toDataURL(type, 0.9));
        } catch (e) {
          if (typeof showToast === "function")
            showToast("裁剪失败，请从相册导入图片");
        }
      });
      shade.onclick = (e) => {
        if (e.target === shade) finish(null);
      };
      shade.append(box);
      document.body.append(shade);
      document.addEventListener("keydown", escape);
      draw();
    });
  }
  window.UwUImageCrop110 = { crop };
})();
