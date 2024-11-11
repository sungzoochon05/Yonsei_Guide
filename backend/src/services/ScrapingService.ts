// ScrapingService.ts
import { ScrapedData, LibraryResource } from '../types/backendInterfaces';
import { ScrapingConfig } from '../types/scraping/platforms';

export interface ScrapingService {
  scrape(url: string, config: ScrapingConfig): Promise<ScrapedData>;
  getLibraryStatus(): Promise<LibraryResource>; // LibraryResponse를 LibraryResource로 변경
}