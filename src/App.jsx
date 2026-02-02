import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X, AlignLeft, Trash2, Search, Calendar, Tag, Cloud, CloudOff, Loader2, LogOut, User, Edit2, Check, CheckCircle, Circle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import quickboardIcon from "./assets/quickboard-ic.png";

// Add custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
  
  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #9ca3af transparent;
  }
`;


// --- LOGIN COMPONENT ---
const AuthScreen = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/register' : '/api/login';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (isRegistering) {
        setIsRegistering(false);
        setError('Account created! Please login.');
        setUsername(''); setPassword('');
      } else {
        onLogin(data.token, data.username);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0079bf] p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
        {/* Project Icon */}
        <div className="flex justify-center mb-2">
          <img 
            src={quickboardIcon} 
            alt="Quickboard" 
            className="w-16 h-16 object-contain"
          />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h2>
        
        {error && (
          <div className={`p-3 rounded text-sm mb-4 ${error.includes('created') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : (isRegistering ? 'Register' : 'Login')}
          </button>
        </form>

        <button 
          onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
          className="w-full mt-4 text-sm text-gray-500 hover:text-indigo-600 hover:underline"
        >
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const TAG_COLORS = {
  'Meeting': 'bg-blue-100 text-blue-800 border-blue-200',
  'Urgent': 'bg-red-100 text-red-800 border-red-200',
  'Idea': 'bg-green-100 text-green-800 border-green-200',
  'General': 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_STYLES = {
  'pending': 'bg-yellow-50 border-yellow-200',
  'in-progress': 'bg-blue-50 border-blue-200',
  'completed': 'bg-green-50 border-green-200',
};

const App = () => {
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || '');

  // Board State
  const [boardData, setBoardData] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isMounted, setIsMounted] = useState(false);
  
  // UI States
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingCardToCol, setAddingCardToCol] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editingListId, setEditingListId] = useState(null);
  const [editingListTitle, setEditingListTitle] = useState("");

  const listInputRef = useRef(null);
  const cardInputRef = useRef(null);
  const listTitleInputRef = useRef(null);

  // Mount check
  useEffect(() => { 
    setIsMounted(true);
    
    // Inject scrollbar styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = scrollbarStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Login Handler
  const handleLogin = (newToken, newUsername) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setCurrentUser(newUsername);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setCurrentUser('');
    setBoardData(null);
  };

  // Load Data (Only if token exists)
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const response = await fetch('/api/board', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
          handleLogout(); // Token expired
          return;
        }
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setBoardData(data);
      } catch (err) {
        console.error(err);
        setSaveStatus('error');
      }
    };
    loadData();
  }, [token]);

  // Auto-Save
  useEffect(() => {
    if (!boardData || !token) return;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/board', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(boardData),
        });
        if (!response.ok) throw new Error('Failed to save');
        setSaveStatus('saved');
      } catch (err) {
        console.error(err);
        setSaveStatus('error');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [boardData, token]);

  useEffect(() => {
    if (isAddingList && listInputRef.current) listInputRef.current.focus();
    if (addingCardToCol && cardInputRef.current) cardInputRef.current.focus();
    if (editingListId && listTitleInputRef.current) {
      listTitleInputRef.current.focus();
      listTitleInputRef.current.select();
    }
  }, [isAddingList, addingCardToCol, editingListId]);

  // If no token, show Login Screen
  if (!token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // --- Logic Methods ---
  const onDragEnd = (result) => {
    const { destination, source, type } = result;
    if (searchQuery || !destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
      const newColumnOrder = Array.from(boardData.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, result.draggableId);
      setBoardData(prev => ({ ...prev, columnOrder: newColumnOrder }));
      return;
    }

    const startColumn = boardData.columns[source.droppableId];
    const endColumn = boardData.columns[destination.droppableId];

    if (startColumn === endColumn) {
      const newItems = Array.from(startColumn.items);
      const [movedItem] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, movedItem);
      const newColumn = { ...startColumn, items: newItems };
      setBoardData(prev => ({ ...prev, columns: { ...prev.columns, [newColumn.id]: newColumn } }));
    } else {
      const startItems = Array.from(startColumn.items);
      const [movedItem] = startItems.splice(source.index, 1);
      const endItems = Array.from(endColumn.items);
      endItems.splice(destination.index, 0, movedItem);
      setBoardData(prev => ({
        ...prev,
        columns: {
          ...prev.columns,
          [startColumn.id]: { ...startColumn, items: startItems },
          [endColumn.id]: { ...endColumn, items: endItems },
        },
      }));
    }
  };

  const handleAddList = () => {
    if (!newListTitle.trim()) { setIsAddingList(false); return; }
    const newId = uuidv4();
    const newCol = { id: newId, title: newListTitle, items: [] };
    setBoardData(prev => ({ ...prev, columns: { ...prev.columns, [newId]: newCol }, columnOrder: [...prev.columnOrder, newId] }));
    setNewListTitle("");
    setIsAddingList(false);
  };

  const deleteList = (columnId) => {
    if(!window.confirm("Delete this list?")) return;
    const newColumns = { ...boardData.columns };
    delete newColumns[columnId];
    const newOrder = boardData.columnOrder.filter(id => id !== columnId);
    setBoardData(prev => ({ ...prev, columns: newColumns, columnOrder: newOrder }));
  };

  const startEditingListTitle = (columnId, currentTitle) => {
    setEditingListId(columnId);
    setEditingListTitle(currentTitle);
  };

  const saveListTitle = (columnId) => {
    if (!editingListTitle.trim()) {
      setEditingListId(null);
      return;
    }
    setBoardData(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        [columnId]: { ...prev.columns[columnId], title: editingListTitle }
      }
    }));
    setEditingListId(null);
    setEditingListTitle("");
  };

  const handleAddCard = (columnId) => {
    if (!newCardTitle.trim()) { setAddingCardToCol(null); return; }
    const newItem = { 
      id: uuidv4(), 
      title: newCardTitle, 
      content: '', 
      tag: 'General', 
      status: 'pending',
      createdAt: new Date().toLocaleDateString() 
    };
    setBoardData(prev => ({ ...prev, columns: { ...prev.columns, [columnId]: { ...prev.columns[columnId], items: [...prev.columns[columnId].items, newItem] } } }));
    setNewCardTitle("");
    if(cardInputRef.current) cardInputRef.current.focus();
  };

  const saveCardDetails = () => {
    if (!editingItem) return;
    let foundColId = null;
    let foundItems = null;
    Object.entries(boardData.columns).forEach(([colId, col]) => {
      if (col.items.find(i => i.id === editingItem.id)) { foundColId = colId; foundItems = col.items; }
    });
    if (foundColId) {
      const updatedItems = foundItems.map(i => i.id === editingItem.id ? editingItem : i);
      setBoardData(prev => ({ ...prev, columns: { ...prev.columns, [foundColId]: { ...prev.columns[foundColId], items: updatedItems } } }));
    }
    setEditingItem(null);
  };

  const deleteCard = () => {
    if(!editingItem) return;
     Object.entries(boardData.columns).forEach(([colId, col]) => {
      if (col.items.find(i => i.id === editingItem.id)) {
        const newItems = col.items.filter(i => i.id !== editingItem.id);
        setBoardData(prev => ({ ...prev, columns: { ...prev.columns, [colId]: { ...prev.columns[colId], items: newItems } } }));
      }
    });
    setEditingItem(null);
  }

  const toggleCardComplete = (e, itemId, currentStatus) => {
    e.stopPropagation(); // Prevent opening the edit modal
    
    Object.entries(boardData.columns).forEach(([colId, col]) => {
      const itemIndex = col.items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const updatedItems = [...col.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          status: currentStatus === 'completed' ? 'pending' : 'completed'
        };
        setBoardData(prev => ({
          ...prev,
          columns: {
            ...prev.columns,
            [colId]: { ...prev.columns[colId], items: updatedItems }
          }
        }));
      }
    });
  };

  // Loading state (only if we have a token but no data yet)
  if (!boardData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0079bf] text-white">
        <Loader2 className="w-8 h-8 animate-spin" /><span className="ml-2">Loading {currentUser}'s Board...</span>
      </div>
    );
  }
  
  if (!isMounted) return null;

  return (
    <div className="h-dvh flex flex-col bg-[#0079bf] font-sans selection:bg-indigo-300 selection:text-indigo-900" 
      style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', }}
    >
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
        <div className="max-w-full px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div className="flex items-center justify-between">
            <h1 className="text-white font-bold text-lg flex items-center gap-2 drop-shadow-md">
              <img
                src={quickboardIcon}
                alt="QuickBoard"
                className="w-10 h-10"
              />
              <span>QuickBoard</span>
            </h1>
            
            {/* Mobile Header Icons */}
            <div className="md:hidden flex items-center gap-3">
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-white/70 animate-spin" />}
              {saveStatus === 'saved' && <Cloud className="w-4 h-4 text-green-400" />}
              <button onClick={handleLogout} className="text-white/70 hover:text-white"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/20 text-white placeholder-white/70 pl-10 pr-4 py-2 rounded-lg text-sm border border-white/10 focus:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"/>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-full text-xs text-white font-medium">
                {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin"/> Saving...</>}
                {saveStatus === 'saved' && <><Cloud className="w-3 h-3 text-green-400"/> Saved</>}
                {saveStatus === 'error' && <><CloudOff className="w-3 h-3 text-red-400"/> Error</>}
                {saveStatus === 'idle' && <span className="text-white/50">Ready</span>}
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm font-medium border-l border-white/20 pl-4">
                <User className="w-4 h-4"/> {currentUser}
                <button onClick={handleLogout} className="ml-2 text-white/60 hover:text-red-300 hover:bg-white/10 p-1.5 rounded transition-colors" title="Logout">
                  <LogOut className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory">
        <div className="h-full flex items-start px-4 py-4 gap-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column" isDropDisabled={!!searchQuery}>
              {(provided) => (
                <div className="flex h-full gap-4 items-start" {...provided.droppableProps} ref={provided.innerRef}>
                  {boardData.columnOrder.map((columnId, index) => {
                    const column = boardData.columns[columnId];
                    const filteredItems = searchQuery ? column.items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.content.toLowerCase().includes(searchQuery.toLowerCase()) || item.tag.toLowerCase().includes(searchQuery.toLowerCase())) : column.items;

                    return (
                      <Draggable draggableId={column.id} index={index} key={column.id} isDragDisabled={!!searchQuery}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`snap-center shrink-0 w-[calc(100vw-2rem)] md:w-80 flex flex-col h-fit max-h-[calc(100vh-8rem)] ${snapshot.isDragging ? 'z-50' : ''}`}
                            style={{ ...provided.draggableProps.style }} 
                          >
                            <div className={`bg-[#f1f2f4] overflow-y-auto rounded-xl shadow-xl border border-white/20 flex flex-col h-full ${snapshot.isDragging ? 'shadow-2xl ring-4 ring-indigo-500/30 rotate-2' : ''}`}>
                              <div {...provided.dragHandleProps} className="p-3 pl-4 pr-2 flex justify-between items-center cursor-grab active:cursor-grabbing border-b border-gray-200/50 group shrink-0">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {editingListId === column.id ? (
                                    <input
                                      ref={listTitleInputRef}
                                      type="text"
                                      value={editingListTitle}
                                      onChange={(e) => setEditingListTitle(e.target.value)}
                                      onBlur={() => saveListTitle(column.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveListTitle(column.id);
                                        if (e.key === 'Escape') setEditingListId(null);
                                      }}
                                      className="font-bold text-gray-800 text-sm bg-white border-2 border-indigo-500 rounded px-2 py-1 outline-none flex-1 min-w-0"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <>
                                      <h2 className="font-bold text-gray-800 text-sm truncate">{column.title}</h2>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingListTitle(column.id, column.title);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-all"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs text-gray-500 font-bold bg-gray-200/80 px-2 py-0.5 rounded-full min-w-6 text-center">{filteredItems.length}</span>
                                  <button onClick={() => deleteList(column.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <Droppable droppableId={column.id} type="card" isDropDisabled={!!searchQuery}>
                                {(provided, snapshot) => (
                                  <div 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef} 
                                    className={`custom-scrollbar flex-1 overflow-y-auto px-2 py-2 min-h-25 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                                  >
                                    {filteredItems.map((item, index) => {
                                      const itemStatus = item.status || 'pending'; // Default to pending if not set
                                      return (
                                      <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!!searchQuery}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            onClick={() => setEditingItem({...item, status: itemStatus})}
                                            className={`bg-white p-3 mb-2.5 rounded-lg border-2 cursor-pointer hover:border-indigo-400 active:scale-[0.98] transition-all duration-200 relative group shadow-sm hover:shadow-md ${
                                              itemStatus === 'completed' 
                                                ? 'bg-green-50/50 border-green-300' 
                                                : itemStatus === 'in-progress'
                                                ? 'bg-blue-50/50 border-blue-300'
                                                : 'border-gray-200'
                                            } ${snapshot.isDragging ? 'rotate-2 shadow-2xl ring-2 ring-indigo-500 z-50' : ''}`}
                                            style={{ ...provided.draggableProps.style }}
                                          >
                                            {/* Complete Button - Top Right */}
                                            <button
                                              onClick={(e) => toggleCardComplete(e, item.id, itemStatus)}
                                              className={`absolute top-2 right-2 p-1 rounded-full transition-all hover:scale-110 ${
                                                itemStatus === 'completed' 
                                                  ? 'text-green-600 hover:bg-green-100' 
                                                  : 'text-gray-300 hover:text-green-500 hover:bg-green-50'
                                              }`}
                                              title={itemStatus === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                                            >
                                              {itemStatus === 'completed' ? (
                                                <CheckCircle className="w-5 h-5 fill-current" />
                                              ) : (
                                                <Circle className="w-5 h-5" />
                                              )}
                                            </button>

                                            <div className="flex justify-between items-start mb-2 pr-6">
                                              <div className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${TAG_COLORS[item.tag]}`}>{item.tag}</div>
                                              <div className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3"/>{item.createdAt.split('/').slice(0,2).join('/')}</div>
                                            </div>
                                            <p className={`text-gray-800 text-sm font-medium leading-snug wrap-break-word ${
                                              itemStatus === 'completed' ? 'line-through text-gray-500' : ''
                                            }`}>{item.title}</p>
                                            {item.content && (<div className="mt-3 flex items-center gap-1 text-xs text-gray-400"><AlignLeft className="w-3 h-3" /><span className="truncate max-w-[150px]">{item.content}</span></div>)}
                                          </div>
                                        )}
                                      </Draggable>
                                    )})}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                              {!searchQuery && (
                                <div className="p-2 border-t border-gray-200/50 shrink-0">
                                  {addingCardToCol === column.id ? (
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-indigo-500 animate-in fade-in zoom-in duration-100">
                                      <textarea ref={cardInputRef} placeholder="Type a title..." className="w-full text-sm resize-none outline-none text-gray-800 placeholder-gray-400 block mb-2 min-h-[60px]" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(column.id); }}} />
                                      <div className="flex items-center justify-between">
                                        <button onClick={() => handleAddCard(column.id)} className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-md hover:bg-indigo-700 font-semibold shadow-sm">Add Card</button>
                                        <button onClick={() => setAddingCardToCol(null)} className="text-gray-400 hover:text-gray-600 p-2"><X className="w-5 h-5" /></button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => setAddingCardToCol(column.id)} className="w-full flex items-center gap-2 text-gray-600 hover:bg-gray-200 p-2 rounded-lg text-sm transition-colors font-medium"><Plus className="w-4 h-4" /> Add a card</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <div className="snap-center shrink-0 w-[calc(100vw-2rem)] md:w-80">
            {isAddingList ? (
              <div className="bg-[#f1f2f4] p-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-right-4">
                <input ref={listInputRef} type="text" placeholder="Enter list title..." className="w-full px-3 py-2 text-sm border-2 border-indigo-500 rounded-lg mb-3 focus:outline-none" value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddList()} />
                <div className="flex items-center gap-2">
                  <button onClick={handleAddList} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">Add List</button>
                  <button onClick={() => setIsAddingList(false)} className="text-gray-500 hover:text-gray-700 p-2"><X className="w-5 h-5" /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsAddingList(true)} className="w-full bg-white/20 hover:bg-black/20 backdrop-blur-sm text-white font-medium p-4 rounded-xl flex items-center gap-2 shadow-sm transition-all border border-white/10"><Plus className="w-5 h-5" /> Add another list</button>
            )}
          </div>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center backdrop-blur-sm">
          <div className="bg-white w-full h-[90dvh] md:h-auto md:max-h-[85vh] md:max-w-xl md:rounded-xl rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50 rounded-t-xl shrink-0">
              <div className="w-full mr-4"><input type="text" value={editingItem.title} onChange={(e) => setEditingItem({...editingItem, title: e.target.value})} className="w-full bg-transparent text-xl font-bold text-gray-800 focus:outline-none focus:underline decoration-indigo-300"/></div>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 bg-white">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><Tag className="w-3 h-3" /> Labels</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(TAG_COLORS).map(tag => (
                    <button key={tag} onClick={() => setEditingItem({...editingItem, tag})} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${editingItem.tag === tag ? `${TAG_COLORS[tag]} ring-2 ring-offset-1 ring-indigo-500 scale-105` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{tag}</button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  <CheckCircle className="w-3 h-3" /> Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem({...editingItem, status: 'pending'})}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      (editingItem.status || 'pending') === 'pending'
                        ? 'bg-yellow-50 text-yellow-800 border-yellow-300 ring-2 ring-offset-1 ring-yellow-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setEditingItem({...editingItem, status: 'in-progress'})}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      (editingItem.status || 'pending') === 'in-progress'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-offset-1 ring-blue-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => setEditingItem({...editingItem, status: 'completed'})}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      (editingItem.status || 'pending') === 'completed'
                        ? 'bg-green-50 text-green-800 border-green-300 ring-2 ring-offset-1 ring-green-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>
              
              <div className="h-full flex flex-col">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><AlignLeft className="w-3 h-3"/> Description</label>
                <textarea className="w-full flex-1 min-h-50 bg-gray-50 border border-gray-200 rounded-lg p-4 text-base text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none resize-none leading-relaxed" placeholder="Add more detailed notes here..." value={editingItem.content} onChange={(e) => setEditingItem({...editingItem, content: e.target.value})} />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0 safe-area-bottom">
               <button onClick={deleteCard} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-red-100"><Trash2 className="w-4 h-4"/> <span className="hidden sm:inline">Delete Card</span></button>
              <div className="flex gap-3">
                <button onClick={() => setEditingItem(null)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                <button onClick={saveCardDetails} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-95">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;