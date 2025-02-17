import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Search, LogOut } from 'lucide-react';

interface User {
  _id: string;
  registerNumber: string;
}

interface Message {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  status: 'pending' | 'accepted' | 'rejected';
  isFirstMessage: boolean;
  createdAt: string;
}

function Chat() {
  const { userId, logout } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.emit('user_connected', userId);
    
    socketRef.current.on('users_online', (users: string[]) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('receive_message', async (data) => {
      if (selectedUser && (data.sender === selectedUser._id || data.recipient === selectedUser._id)) {
        fetchMessages(selectedUser._id);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId, selectedUser]);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/users/search?query=${searchQuery}`
      );
      setUsers(response.data.filter((user: User) => user._id !== userId));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (recipientId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/messages/conversation/${userId}/${recipientId}`
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    try {
      const response = await axios.post('http://localhost:5000/api/messages', {
        senderId: userId,
        recipientId: selectedUser._id,
        content: newMessage,
      });

      socketRef.current?.emit('send_message', {
        ...response.data,
        recipientId: selectedUser._id,
      });

      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error sending message');
    }
  };

  const handleMessageResponse = async (messageId: string, status: 'accepted' | 'rejected') => {
    try {
      await axios.put(`http://localhost:5000/api/messages/${messageId}/status`, { status });
      fetchMessages(selectedUser!._id);
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Users List */}
      <div className="w-1/3 bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Chats</h2>
            <button
              onClick={() => logout()}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pl-8 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-116px)]">
          {users.map((user) => (
            <div
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                selectedUser?._id === user._id ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{user.registerNumber}</span>
                {onlineUsers.includes(user._id) && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 bg-white border-b">
              <h3 className="text-lg font-semibold">{selectedUser.registerNumber}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`mb-4 ${
                    message.sender === userId ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.sender === userId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    {message.isFirstMessage && message.status === 'pending' && message.recipient === userId && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleMessageResponse(message._id, 'accepted')}
                          className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleMessageResponse(message._id, 'rejected')}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white border-t">
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;