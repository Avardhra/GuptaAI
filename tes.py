# -*- coding: utf-8 -*-
"""
Mandelbrot Set Visualizer
Author  : AI Assistant
Date    : 2025‑12‑06
Deskripsi:
    Program ini menghasilkan gambar fraktal Mandelbrot dengan
    antarmuka sederhana menggunakan matplotlib.
"""

import numpy as np
import matplotlib.pyplot as plt

# -------------------------------------------------
# Opsional: akselerasi dengan Numba (jika tersedia)
# -------------------------------------------------
try:
    from numba import njit, prange

    @njit(parallel=True, fastmath=True)
    def mandelbrot(c: np.ndarray, max_iter: int) -> np.ndarray:
        """Hitung iterasi Mandelbrot untuk setiap elemen c (array kompleks)."""
        height, width = c.shape
        output = np.empty((height, width), dtype=np.int32)

        for y in prange(height):
            for x in prange(width):
                z = 0j
                count = 0
                while (z.real * z.real + z.imag * z.imag <= 4.0) and (count < max_iter):
                    z = z * z + c[y, x]
                    count += 1
                output[y, x] = count
        return output

except Exception:  # Numba tidak tersedia
    def mandelbrot(c: np.ndarray, max_iter: int) -> np.ndarray:
        """Versi pure‑Python (lebih lambat) bila Numba tidak terpasang."""
        height, width = c.shape
        output = np.empty((height, width), dtype=np.int32)

        for y in range(height):
            for x in range(width):
                z = 0j
                count = 0
                while (z.real * z.real + z.imag * z.imag <= 4.0) and (count < max_iter):
                    z = z * z + c[y, x]
                    count += 1
                output[y, x] = count
        return output


def render(
    width: int = 800,
    height: int = 600,
    max_iter: int = 256,
    x_center: float = -0.75,
    y_center: float = 0.0,
    axis_range: float = 2.5,
) -> None:
    """
    Buat gambar Mandelbrot dan tampilkan dengan matplotlib.

    Parameters
    ----------
    width, height : int
        Resolusi gambar dalam piksel.
    max_iter : int
        Batas iterasi maksimum (semakin tinggi, semakin detail).
    x_center, y_center : float
        Titik pusat bidang kompleks yang akan ditampilkan.
    axis_range : float
        Jarak setengah sumbu (menentukan zoom).
    """
    # 1️⃣ Membuat grid kompleks
    re = np.linspace(x_center - axis_range, x_center + axis_range, width)
    im = np.linspace(y_center - axis_range * height / width,
                     y_center + axis_range * height / width, height)
    X, Y = np.meshgrid(re, im)
    C = X + 1j * Y

    # 2️⃣ Hitung iterasi Mandelbrot
    print("⏳ Menghitung Mandelbrot set, harap tunggu...")
    M = mandelbrot(C, max_iter)

    # 3️⃣ Normalisasi untuk colormap
    norm = np.sqrt(M / max_iter)  # memberi efek “smooth”

    # 4️⃣ Visualisasi dengan matplotlib
    plt.figure(figsize=(width / 100, height / 100), dpi=100)
    plt.imshow(
        norm,
        cmap="turbo",          # colormap modern, cocok untuk fraktal
        extent=[re.min(), re.max(), im.min(), im.max()],
        origin="lower",
    )
    plt.title("Mandelbrot Set", fontsize=16, fontweight="bold")
    plt.xlabel("Re(z)")
    plt.ylabel("Im(z)")
    plt.axis("off")  # sembunyikan axis agar lebih bersih
    plt.tight_layout()
    plt.show()


# -------------------------------------------------
# Eksekusi utama
# -------------------------------------------------
if __name__ == "__main__":
    # Anda dapat mengubah parameter di sini untuk eksplorasi
    render(
        width=1200,
        height=800,
        max_iter=500,
        x_center=-0.75,
        y_center=0.0,
        axis_range=1.5,
    )