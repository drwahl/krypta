import React, { useState, useMemo } from 'react';
import { X, Forward, Search } from 'lucide-react';
import { useMatrix } from '../MatrixContext';
import { MatrixEvent } from 'matrix-js-sdk';

interface ForwardMessageProps {
  event: MatrixEvent;
  onClose: () => void;
}

const ForwardMessage: React.FC<ForwardMessageProps> = ({ event, onClose }) => {
  const { client, rooms } = useMatrix();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const content = event.getContent();
  const messageText = content.body || '';

  // Filter rooms (exclude spaces)
  const availableRooms = useMemo(() => {
    return rooms.filter((room) => {
      const createEvent = room.currentState.getStateEvents('m.room.create', '');
      const roomType = createEvent?.getContent()?.type;
      return roomType !== 'm.space';
    });
  }, [rooms]);

  // Filter rooms based on search
  const filteredRooms = useMemo(() => {
    if (!searchQuery) return availableRooms;
    const query = searchQuery.toLowerCase();
    return availableRooms.filter((room) =>
      room.name.toLowerCase().includes(query)
    );
  }, [availableRooms, searchQuery]);

  const toggleRoom = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleForward = async () => {
    if (!client || selectedRooms.length === 0) return;

    setIsForwarding(true);

    try {
      // Forward to each selected room
      await Promise.all(
        selectedRooms.map(async (roomId) => {
          await client.sendEvent(roomId, 'm.room.message' as any, {
            msgtype: content.msgtype || 'm.text',
            body: messageText,
            ...(content.format && { format: content.format }),
            ...(content.formatted_body && { formatted_body: content.formatted_body }),
          });
        })
      );

      console.log(`✅ Forwarded message to ${selectedRooms.length} room(s)`);
      onClose();
    } catch (error) {
      console.error('Failed to forward message:', error);
      alert('Failed to forward message');
      setIsForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Forward className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Forward Message</h2>
              <p className="text-sm text-slate-400">Select rooms to forward to</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Message Preview */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <p className="text-sm text-slate-400 mb-1">Message to forward:</p>
            <p className="text-white">{messageText}</p>
          </div>

          {/* Selected Rooms Count */}
          {selectedRooms.length > 0 && (
            <div className="text-sm text-slate-300">
              Selected {selectedRooms.length} room{selectedRooms.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Room List */}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No rooms found</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = selectedRooms.includes(room.roomId);
                return (
                  <button
                    key={room.roomId}
                    onClick={() => toggleRoom(room.roomId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      isSelected
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : 'hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{room.name}</div>
                      <div className="text-xs text-slate-400">
                        {room.getJoinedMemberCount()} members
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedRooms.length === 0 || isForwarding}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition font-medium flex items-center gap-2"
          >
            {isForwarding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Forwarding...
              </>
            ) : (
              <>
                <Forward className="w-4 h-4" />
                Forward to {selectedRooms.length || ''} room{selectedRooms.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessage;

