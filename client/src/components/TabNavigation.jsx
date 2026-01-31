function TabNavigation({ tabs, activeTab, onTabChange, counts = {} }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${isActive 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex items-center gap-2">
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className={`
                    ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default TabNavigation;