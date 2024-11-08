import { ScrapedData, LibraryResponse } from '../types/backendInterfaces';
import { ScrapingConfig } from '../types/scraping/platforms';

export interface ScrapingService {
  scrape(url: string, config: ScrapingConfig): Promise<ScrapedData>;
  getLibraryStatus(): Promise<LibraryResponse>;
}