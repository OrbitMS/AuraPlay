import React, { useState, useContext } from 'react';
import { searchMusic } from '../services/youtube';
import { AudioContext } from '../context/AudioContext';
import { Search, Play, Music } from 'lucide-react';

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioContext = useContext(AudioContext);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const songs = await searchMusic(query);
      setResults(songs);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto pb-24">
      <h1 className="text-2xl font-bold mb-6 text-white">Search YouTube Music</h1>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for songs, artists, or albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1c1c1c] text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 border border-neutral-800"
          />
        </div>
        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="space-y-2">
        {results.map((song: any) => (
          <div
            key={song.id}
            className="flex items-center justify-between p-3 bg-[#161616] hover:bg-[#222222] rounded-lg transition group cursor-pointer"
            onClick={() => audioContext?.playTrack({
              id: song.id,
              title: song.name,
              artist: song.artists?.[0]?.name || 'Unknown Artist',
              thumbnail: song.thumbnails?.[0]?.url || ''
            })}
          >
            <div className="flex items-center gap-4">
              {song.thumbnails?.[0]?.url ? (
                <img src={song.thumbnails[0].url} alt={song.name} className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 bg-neutral-800 rounded flex items-center justify-center">
                  <Music className="w-6 h-6 text-neutral-400" />
                </div>
              )}
              <div>
                <h3 className="font-medium text-white group-hover:text-red-400 transition">{song.name}</h3>
                <p className="text-sm text-gray-400">{song.artists?.[0]?.name || 'Unknown Artist'}</p>
              </div>
            </div>
            
            <button className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 rounded-full text-white transition transform hover:scale-105">
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};