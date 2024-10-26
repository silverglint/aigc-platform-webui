<script setup lang="ts">
import {useRoute} from "vue-router";
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import {deleteRole, ImageRole, roles as queryRoles, saveToCommonRole,} from "@/api/image-chapter.ts";
import {Message, Modal} from "@arco-design/web-vue";
import {COMMON_ROLE_CHANGE, ROLE_CHANGE} from "@/types/event-types.ts";
import RoleEdit from "@/views/image/drama/chapter-content/components/RoleEdit.vue";
import {EventTypes} from "@/types/global.ts";
import emitter from "@/mitt";

const route = useRoute();

const roleRenameModalVisible = ref<boolean>(false);

const roles = ref<ImageRole[]>([])

const handleQueryRoles = async () => {
  const {data} = await queryRoles({
    projectId: route.query.projectId as string,
    chapterId: route.query.chapterId as string,
  })
  roles.value = data;
}

const ruleActiveKey = ref<(string | number)[]>([])
const openAllRule = () => {
  ruleActiveKey.value.length !== 0
      ? ruleActiveKey.value = []
      : ruleActiveKey.value = [...Array(roles.value.length).keys()]
}

const currentRole = ref<ImageRole>({} as ImageRole);

const onRoleRename = (role: ImageRole) => {
  currentRole.value = role;
  roleRenameModalVisible.value = true;
}

const onDeleteRole = (role: ImageRole) => {
  Modal.error({
    title: `确认删除角色[${role.role}]?`,
    content: '',
    async onOk() {
      const {msg} = await deleteRole({
        ...role,
        projectId: route.query.projectId as string,
      });
      Message.success(msg);
      emitter.emit(ROLE_CHANGE)
    },
  })
}

const onSaveToCommonRole = async (role: ImageRole) => {
  const {data, msg} = await saveToCommonRole(role)
  if (!data) {
    Modal.confirm({
      title: '已存在预置角色',
      content: '是否覆盖预置角色配置？',
      okText: '是',
      cancelText: '否',
      async onOk() {
        const {msg} = await saveToCommonRole({
          ...role,
          coverCommonRole: true
        });
        Message.success(msg);
        emitter?.emit(COMMON_ROLE_CHANGE);
      }
    });
  } else {
    Message.success(msg);
    emitter?.emit(COMMON_ROLE_CHANGE);
  }
}

const refreshInner = () => {
  handleQueryRoles();
}

defineExpose({refreshInner})

const roleChangeEvent = () => {
  handleQueryRoles();
}

const wsDataHandler = () => {
  handleQueryRoles();
};

onMounted(() => {
  emitter?.on(ROLE_CHANGE, roleChangeEvent);
  emitter?.on(EventTypes.chapter_role_refresh, wsDataHandler);
});

onBeforeUnmount(() => {
  emitter?.off(ROLE_CHANGE, roleChangeEvent);
  emitter?.off(EventTypes.chapter_role_refresh, wsDataHandler);
});

watch(
    () => route.query.chapterId,
    () => {
      if (route.query.chapterId) {
        handleQueryRoles();
      }
    },
    {immediate: true}
);

</script>

<template>
  <div>
    <div>
      <a-button
          v-if="roles && roles.length"
          type="outline"
          size="small"
          style="margin-bottom: 12px"
          @click="openAllRule"
      >
        {{ ruleActiveKey.length !== 0 ? '收起所有' : '展开所有' }}
      </a-button>
      <a-collapse
          :active-key="ruleActiveKey"
          @change="(value: any) => (ruleActiveKey = value)"
      >
        <a-collapse-item v-for="(item, index) in roles" :key="index">
          <template #header>
            <span>{{ `${item.role}(${item.roleCount})` }}</span>
          </template>
          <div>
            <div>
              <a-descriptions :column="1"
                              size="medium">
                <a-descriptions-item label="提示词">
                  {{ item.imagePrompt }}
                </a-descriptions-item>
              </a-descriptions>
            </div>
            <div style="text-align: left">
              <a-space wrap>
                <a-dropdown-button
                    type="outline"
                    size="small"
                >
                  角色
                  <template #icon>
                    <icon-down/>
                  </template>
                  <template #content>
                    <a-doption @click="onRoleRename(item)">角色修改</a-doption>
                    <a-doption @click="onDeleteRole(item)">删除角色</a-doption>
                    <a-doption @click="onSaveToCommonRole(item)">保存预置</a-doption>
                  </template>
                </a-dropdown-button>
              </a-space>
            </div>
          </div>
        </a-collapse-item>
      </a-collapse>

    </div>
    <role-edit
        v-model:visible="roleRenameModalVisible"
        :role="currentRole"
        :role-type="'role'"
    />
  </div>
</template>

<style scoped>
:deep(.arco-typography, p.arco-typography) {
  margin: 0;
}
</style>
