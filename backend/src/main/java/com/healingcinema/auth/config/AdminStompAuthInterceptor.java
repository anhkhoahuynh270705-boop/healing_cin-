package com.healingcinema.auth.config;

import java.security.Principal;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.healingcinema.auth.service.AdminAuthService;

/** Gắn Principal cho admin STOMP và chặn subscription vào queue riêng của admin. */
@Component
public class AdminStompAuthInterceptor implements ChannelInterceptor {

    private static final String ADMIN_DESTINATION = "/user/queue/admin/payments";
    private final AdminAuthService adminAuth;

    public AdminStompAuthInterceptor(AdminAuthService adminAuth) {
        this.adminAuth = adminAuth;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("x-admin-token");
            if (token != null) {
                if (!adminAuth.isValid(token)) return null;
                accessor.setUser((Principal) () -> "admin");
            }
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                && ADMIN_DESTINATION.equals(accessor.getDestination())
                && (accessor.getUser() == null || !"admin".equals(accessor.getUser().getName()))) {
            return null;
        }
        return message;
    }
}
