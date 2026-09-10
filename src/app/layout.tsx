import '@assets/globals.css';
import { Inter } from 'next/font/google';

import Header from '@components/layout/Header';
import Main from '@components/layout/Main';
import Footer from '@components/layout/Footer';
import { I18nProvider } from '@providers/I18nProvider';
import { CollectionProvider } from '@providers/CollectionProvider';
import { SearchProvider } from '@providers/SearchProvider';
import { FilterProvider } from '@providers/FilterProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Collector',
  description: 'Gabriel Borges Collector',
  icons: {
    icon: '/pokeball.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning={true}>
      <body className={ `${inter.className} min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950`}>
        <I18nProvider>
          <CollectionProvider>
            <SearchProvider>
              <FilterProvider>
                <Header />
                <Main>{ children }</Main>
                <Footer />
              </FilterProvider>
            </SearchProvider>
          </CollectionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
