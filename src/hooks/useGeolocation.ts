/**
 * Hook para obter localização do usuário.
 * Se a localização não puder ser obtida (permissão negada, timeout, sem suporte),
 * usa o centro de Maceió e marca `isFallback = true` com o motivo em `error`.
 */

import { useState, useEffect } from "react";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface UseGeolocationReturn {
  location: UserLocation | null;
  /** Motivo pelo qual a localização real não foi obtida */
  error: string | null;
  /** true quando `location` é o fallback (Maceió), não a posição real */
  isFallback: boolean;
  isLoading: boolean;
}

export const MACEIO: UserLocation = { latitude: -9.6498, longitude: -35.735 };

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<UseGeolocationReturn>({
    location: null,
    error: null,
    isFallback: false,
    isLoading: true,
  });

  useEffect(() => {
    const fallback = (reason: string) =>
      setState({ location: MACEIO, error: reason, isFallback: true, isLoading: false });

    if (!navigator.geolocation) {
      fallback("Geolocalização não é suportada neste navegador.");
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          isFallback: false,
          isLoading: false,
        });
      },
      (err) => {
        if (cancelled) return;
        fallback(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada."
            : `Não foi possível obter sua localização (${err.message}).`,
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
