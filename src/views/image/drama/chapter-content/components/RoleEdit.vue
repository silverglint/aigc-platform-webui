<script setup lang="ts">
import {PropType, ref, watch} from "vue";
import {FormInstance, Message} from "@arco-design/web-vue";
import {useRoute} from "vue-router";
import {COMMON_ROLE_CHANGE, ROLE_CHANGE} from "@/types/event-types.ts";
import {
  commonRoles as queryCommonRoles,
  createCommonRole,
  ImageRole,
  roles as queryRoles,
  updateCommonRole,
  updateRole
} from "@/api/image-chapter.ts";
import emitter from "@/mitt";

const route = useRoute();
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  role: {
    type: Object as PropType<ImageRole>
  },
  roleType: {
    type: String as PropType<'role' | 'commonRole'>
  },
  actionType: {
    type: String as PropType<'add' | 'edit'>
  }
})

const emits = defineEmits(['update:visible']);

const showModal = ref<boolean>(false);

const roles = ref<ImageRole[]>([]);
const commonRoles = ref<ImageRole[]>([]);

const formRef = ref<FormInstance>()
const form = ref<ImageRole>({} as ImageRole);

const handleBeforeOk = async (done: (closed: boolean) => void) => {
  const res = await formRef.value?.validate();
  if (!res) {
    const find = (props.roleType === 'role' ? roles.value : commonRoles.value)
        .find(item => item.role === form.value.role && item.role !== props.role?.role);

    if (find) {
      formRef.value?.setFields({
        role: {
          status: 'error',
          message: `已存在[${find.role}]角色名`
        },
      });
      done(false);
      return;
    }

    if (props.actionType === 'add') {
      if (props.roleType === 'commonRole') {
        const {msg} = await createCommonRole({
          ...props.role,
          role: form.value.role,
          imagePrompt: form.value.imagePrompt,
          projectId: route.query.projectId as string,
        })
        Message.success(msg);
        done(true);
        emitter?.emit(COMMON_ROLE_CHANGE);
      }
    } else {
      if (props.roleType === 'role') {
        const {msg} = await updateRole({
          ...props.role,
          role: form.value.role,
          imagePrompt: form.value.imagePrompt,
        } as ImageRole)
        Message.success(msg);
        done(true);
        emitter?.emit(ROLE_CHANGE);
      }
      if (props.roleType === 'commonRole') {
        const {msg} = await updateCommonRole({
          ...props.role,
          role: form.value.role,
          imagePrompt: form.value.imagePrompt
        } as ImageRole)
        Message.success(msg);
        done(true);
        emitter?.emit(COMMON_ROLE_CHANGE);
      }
    }
  }
  done(false)
};

const close = () => {
  emits('update:visible', false);
}

const handleQueryRoles = async () => {
  const {data} = await queryRoles({
    projectId: route.query.projectId as string,
    chapterId: route.query.chapterId as string,
  })
  roles.value = data;
}

const handleQueryCommonRoles = async () => {
  const {data} = await queryCommonRoles({
    projectId: route.query.projectId as string,
  });
  commonRoles.value = data;
}

watch(
    () => props.visible,
    async () => {
      if (props.visible) {
        await handleQueryRoles();
        await handleQueryCommonRoles();
        showModal.value = props.visible
        form.value = {
          role: props.role?.role,
          imagePrompt: props.role?.imagePrompt,
        } as ImageRole
      }
    },
    {immediate: true}
);
</script>

<template>
  <div>
    <a-modal v-model:visible="showModal"
             :title="`${props.roleType === 'commonRole' ? '公共角色模板' : '角色模板'}-${props.role?.role||''}`"
             @before-ok="handleBeforeOk"
             @close="close"
             @cancel="close">
      <a-form ref="formRef"
              :model="form"
              size="small">
        <a-form-item label="角色名" field="role" required>
          <a-input v-model="form.role"/>
        </a-form-item>
        <a-form-item label="提示词" field="imagePrompt" required>
          <a-textarea v-model="form.imagePrompt" :auto-size="{minRows: 2, maxRows: 5}"/>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>

</style>
