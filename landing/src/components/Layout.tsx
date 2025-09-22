import type { PropsWithChildren } from "react";
import Navigation from "./Navigation";
import { YandexMetrika } from "./YandexMetrika";

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen">
      <YandexMetrika counterId={103986343} />
      <Navigation />
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
};

export default Layout;
