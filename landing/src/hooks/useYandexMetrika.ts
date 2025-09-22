import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { YANDEX_METRIKA_CONFIG, YandexMetrikaGoal, YandexMetrikaEvent } from '../config/yandexMetrika';

declare global {
  interface Window {
    ym: (id: number, action: string, params?: any) => void;
  }
}

export const useYandexMetrika = (counterId: number = YANDEX_METRIKA_CONFIG.counterId) => {
  const router = useRouter();

  useEffect(() => {
    // Отслеживаем переходы между страницами в SPA
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(counterId, 'hit', router.asPath);
    }
  }, [router.asPath, counterId]);

  // Функция для отправки пользовательских событий
  const trackEvent = (eventName: YandexMetrikaEvent, params?: Record<string, any>) => {
    if (window.ym) {
      window.ym(counterId, 'reachGoal', eventName);
    }
  };

  // Функция для отслеживания кликов
  const trackClick = (target: string, goal: YandexMetrikaGoal = YANDEX_METRIKA_CONFIG.goals.CLICK_BUTTON) => {
    if (window.ym) {
      window.ym(counterId, 'reachGoal', goal);
    }
  };

  // Функция для отслеживания форм
  const trackForm = (formName: string, goal: YandexMetrikaGoal = YANDEX_METRIKA_CONFIG.goals.FORM_SUBMIT) => {
    if (window.ym) {
      window.ym(counterId, 'reachGoal', goal);
    }
  };

  // Функция для отслеживания покупок
  const trackPurchase = (orderId: string, price: number, currency: string = 'RUB') => {
    if (window.ym) {
      window.ym(counterId, 'reachGoal', 'purchase');
    }
  };

  return {
    trackEvent,
    trackClick,
    trackForm,
    trackPurchase
  };
};
