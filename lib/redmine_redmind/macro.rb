require 'base64'

module RedmineRedmind
  module Macro
    ALLOWED_OPTIONS = [:height, :direction, :theme].freeze

    def self.install
      Redmine::WikiFormatting::Macros.register do
        desc RedmineRedmind::Macro.description
        macro :mindmap do |obj, args, text|
          args, options = extract_macro_options(args, *RedmineRedmind::Macro::ALLOWED_OPTIONS)
          RedmineRedmind::Macro.render(self, obj, args, options, text)
        end
      end
    end

    def self.description
      "Renders an indented bullet list as an interactive mindmap diagram.\n\n" \
        "{{mindmap\n- Root topic\n  - Branch A\n    - Leaf\n  - Branch B\n}}\n\n" \
        "Optional arguments: {{mindmap(My Title, height=480, direction=side)\n- ...\n}}"
    end

    def self.render(helper, object, args, options, text)
      outline = text.to_s
      title = args.first.to_s
      editable = RedmineRedmind::Registry.editable?(object, User.current)

      data = {
        mindmap_outline: encode(outline),
        mindmap_title: encode(title),
        mindmap_editable: editable.to_s
      }
      data[:mindmap_height] = digits(options[:height]) if options[:height].present?
      data[:mindmap_direction] = options[:direction] if options[:direction].present?
      data[:mindmap_theme] = options[:theme] if options[:theme].present?

      if editable
        data[:mindmap_object_type] = object.class.name
        data[:mindmap_object_id] = object.id
        version = RedmineRedmind::Registry.version_for(object)
        data[:mindmap_version] = version unless version.nil?
      end

      diagram = helper.content_tag(:div, ''.html_safe, class: 'mindmap-diagram')
      fallback = helper.content_tag(:noscript, helper.content_tag(:pre, outline))
      helper.content_tag(:div, diagram + fallback, class: 'mindmap-wrapper', data: data)
    end

    def self.encode(str)
      Base64.strict_encode64(str.to_s.encode('UTF-8'))
    end

    def self.digits(value)
      value.to_s.gsub(/[^0-9]/, '')
    end
  end
end
