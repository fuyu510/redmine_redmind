Rails.application.routes.draw do
  post 'mindmaps/save', to: 'mindmaps#update'
end
