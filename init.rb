mindmap_version = File.read(File.expand_path('VERSION', __dir__)).strip

Redmine::Plugin.register :redmine_redmind do
  name 'Redmine Redmind'
  author 'Redmine Redmind contributors'
  description 'Author mindmaps as indented lists; render and visually edit them as interactive diagrams in wiki pages and issues.'
  version mindmap_version
  url 'https://github.com/fuyu510/redmine_redmind'
  author_url 'https://github.com/fuyu510'
  requires_redmine version_or_higher: '5.1.0'
end

RedmineRedmind::Macro.install

Rails.application.config.after_initialize do
  require File.expand_path('lib/redmine_redmind/hooks', __dir__)
end
