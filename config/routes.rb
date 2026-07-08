Rails.application.routes.draw do
  post 'mindmaps/save', to: 'mindmaps#update'
  get 'mindmaps/issues', to: 'mindmaps#issues'
end
